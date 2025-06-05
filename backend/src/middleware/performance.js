const logger = require('../utils/logger');
const cacheService = require('../services/cacheService');

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.slowQueryThreshold = 1000; // 1 second
    this.enabled = process.env.PERFORMANCE_MONITORING !== 'false';
  }

  // Middleware for monitoring request performance
  requestMonitoring() {
    return (req, res, next) => {
      if (!this.enabled) return next();

      const startTime = Date.now();
      const startMemory = process.memoryUsage();

      // Track request details
      req.startTime = startTime;
      req.requestId = this.generateRequestId();

      // Override res.end to capture response metrics
      const originalEnd = res.end;
      res.end = function(...args) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const endMemory = process.memoryUsage();

        // Calculate memory delta
        const memoryDelta = {
          rss: endMemory.rss - startMemory.rss,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal
        };

        // Log performance metrics
        const metrics = {
          requestId: req.requestId,
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration,
          memoryDelta,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          timestamp: new Date().toISOString()
        };

        // Log slow requests
        if (duration > 2000) {
          logger.warn('Slow request detected', metrics);
        }

        // Store metrics for analysis
        this.storeMetrics(metrics);

        // Call original end
        originalEnd.apply(res, args);
      }.bind(this);

      next();
    };
  }

  // Database query monitoring
  queryMonitoring() {
    return {
      beforeQuery: (query, options) => {
        if (!this.enabled) return;

        options.startTime = Date.now();
        options.queryId = this.generateRequestId();
        
        logger.debug('Executing query', {
          queryId: options.queryId,
          sql: query.replace(/\s+/g, ' ').trim().substring(0, 200),
          bindings: options.bind?.slice(0, 10) // Limit logged bindings
        });
      },

      afterQuery: (query, options, result) => {
        if (!this.enabled || !options.startTime) return;

        const duration = Date.now() - options.startTime;
        
        const queryMetrics = {
          queryId: options.queryId,
          duration,
          rowCount: Array.isArray(result) ? result.length : 1,
          sql: query.replace(/\s+/g, ' ').trim().substring(0, 200),
          timestamp: new Date().toISOString()
        };

        // Log slow queries
        if (duration > this.slowQueryThreshold) {
          logger.warn('Slow query detected', queryMetrics);
        }

        this.storeQueryMetrics(queryMetrics);
      }
    };
  }

  // Cache monitoring
  cacheMonitoring() {
    const originalGet = cacheService.get.bind(cacheService);
    const originalSet = cacheService.set.bind(cacheService);

    cacheService.get = async (key) => {
      const startTime = Date.now();
      const result = await originalGet(key);
      const duration = Date.now() - startTime;

      this.recordCacheMetric('get', key, duration, result !== null);
      return result;
    };

    cacheService.set = async (key, value, ttl) => {
      const startTime = Date.now();
      const result = await originalSet(key, value, ttl);
      const duration = Date.now() - startTime;

      this.recordCacheMetric('set', key, duration, result);
      return result;
    };
  }

  // External API monitoring
  externalApiMonitoring() {
    return {
      beforeRequest: (config) => {
        if (!this.enabled) return config;

        config.startTime = Date.now();
        config.requestId = this.generateRequestId();
        
        logger.debug('External API request', {
          requestId: config.requestId,
          method: config.method?.toUpperCase(),
          url: config.url,
          timeout: config.timeout
        });

        return config;
      },

      onResponse: (response) => {
        if (!this.enabled || !response.config.startTime) return response;

        const duration = Date.now() - response.config.startTime;
        
        const apiMetrics = {
          requestId: response.config.requestId,
          method: response.config.method?.toUpperCase(),
          url: response.config.url,
          statusCode: response.status,
          duration,
          responseSize: JSON.stringify(response.data).length,
          timestamp: new Date().toISOString()
        };

        if (duration > 5000) {
          logger.warn('Slow external API request', apiMetrics);
        }

        this.storeApiMetrics(apiMetrics);
        return response;
      },

      onError: (error) => {
        if (!this.enabled || !error.config?.startTime) return Promise.reject(error);

        const duration = Date.now() - error.config.startTime;
        
        logger.error('External API error', {
          requestId: error.config.requestId,
          method: error.config.method?.toUpperCase(),
          url: error.config.url,
          duration,
          error: error.message,
          code: error.code,
          timestamp: new Date().toISOString()
        });

        return Promise.reject(error);
      }
    };
  }

  // Memory monitoring
  memoryMonitoring() {
    if (!this.enabled) return;

    setInterval(() => {
      const memUsage = process.memoryUsage();
      const memoryMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      };

      // Log high memory usage
      if (memoryMB.heapUsed > 500) {
        logger.warn('High memory usage detected', memoryMB);
      }

      this.storeMemoryMetrics(memoryMB);
    }, 30000); // Every 30 seconds
  }

  // CPU monitoring
  cpuMonitoring() {
    if (!this.enabled) return;

    let lastCpuUsage = process.cpuUsage();
    
    setInterval(() => {
      const currentCpuUsage = process.cpuUsage(lastCpuUsage);
      const cpuPercent = {
        user: Math.round((currentCpuUsage.user / 1000000) * 100) / 100,
        system: Math.round((currentCpuUsage.system / 1000000) * 100) / 100
      };

      // Log high CPU usage
      if (cpuPercent.user > 80 || cpuPercent.system > 80) {
        logger.warn('High CPU usage detected', cpuPercent);
      }

      this.storeCpuMetrics(cpuPercent);
      lastCpuUsage = process.cpuUsage();
    }, 30000); // Every 30 seconds
  }

  // Store metrics in cache for analysis
  storeMetrics(metrics) {
    try {
      const key = `metrics:request:${Date.now()}:${metrics.requestId}`;
      cacheService.set(key, metrics, 3600); // 1 hour TTL

      // Update aggregated metrics
      this.updateAggregatedMetrics('requests', metrics);
    } catch (error) {
      logger.error('Failed to store request metrics', error);
    }
  }

  storeQueryMetrics(metrics) {
    try {
      const key = `metrics:query:${Date.now()}:${metrics.queryId}`;
      cacheService.set(key, metrics, 3600);

      this.updateAggregatedMetrics('queries', metrics);
    } catch (error) {
      logger.error('Failed to store query metrics', error);
    }
  }

  storeApiMetrics(metrics) {
    try {
      const key = `metrics:api:${Date.now()}:${metrics.requestId}`;
      cacheService.set(key, metrics, 3600);

      this.updateAggregatedMetrics('apis', metrics);
    } catch (error) {
      logger.error('Failed to store API metrics', error);
    }
  }

  recordCacheMetric(operation, key, duration, hit) {
    try {
      const metrics = {
        operation,
        key: key.length > 50 ? key.substring(0, 50) + '...' : key,
        duration,
        hit,
        timestamp: new Date().toISOString()
      };

      const metricKey = `metrics:cache:${Date.now()}:${this.generateRequestId()}`;
      cacheService.set(metricKey, metrics, 3600);

      this.updateAggregatedMetrics('cache', metrics);
    } catch (error) {
      logger.error('Failed to record cache metric', error);
    }
  }

  storeMemoryMetrics(metrics) {
    try {
      const key = `metrics:memory:${Date.now()}`;
      cacheService.set(key, { ...metrics, timestamp: new Date().toISOString() }, 3600);
    } catch (error) {
      logger.error('Failed to store memory metrics', error);
    }
  }

  storeCpuMetrics(metrics) {
    try {
      const key = `metrics:cpu:${Date.now()}`;
      cacheService.set(key, { ...metrics, timestamp: new Date().toISOString() }, 3600);
    } catch (error) {
      logger.error('Failed to store CPU metrics', error);
    }
  }

  // Update aggregated metrics for dashboards
  updateAggregatedMetrics(type, metrics) {
    const hour = new Date().getHours();
    const aggregateKey = `metrics:aggregate:${type}:${hour}`;
    
    // This is a simplified aggregation - in production you might use Redis streams or specialized tools
    cacheService.get(aggregateKey).then(existing => {
      const aggregate = existing || {
        count: 0,
        totalDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
        errors: 0
      };

      aggregate.count++;
      if (metrics.duration) {
        aggregate.totalDuration += metrics.duration;
        aggregate.maxDuration = Math.max(aggregate.maxDuration, metrics.duration);
        aggregate.minDuration = Math.min(aggregate.minDuration, metrics.duration);
      }
      if (metrics.statusCode >= 400 || metrics.error) {
        aggregate.errors++;
      }

      cacheService.set(aggregateKey, aggregate, 3600);
    }).catch(error => {
      logger.error('Failed to update aggregated metrics', error);
    });
  }

  // Get performance metrics
  async getMetrics(type = 'all', timeframe = '1h') {
    try {
      const now = Date.now();
      const timeframes = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000
      };
      
      const since = now - (timeframes[timeframe] || timeframes['1h']);
      const patterns = type === 'all' ? 
        ['metrics:request:*', 'metrics:query:*', 'metrics:api:*', 'metrics:cache:*'] :
        [`metrics:${type}:*`];

      const results = {};
      
      for (const pattern of patterns) {
        const keys = await cacheService.client?.keys(pattern) || [];
        const metrics = [];
        
        for (const key of keys) {
          const timestamp = parseInt(key.split(':')[2]);
          if (timestamp >= since) {
            const metric = await cacheService.get(key);
            if (metric) metrics.push(metric);
          }
        }
        
        const metricType = pattern.split(':')[1].replace('*', '');
        results[metricType] = metrics;
      }

      return results;
    } catch (error) {
      logger.error('Failed to get metrics', error);
      return {};
    }
  }

  // Get system health metrics
  async getSystemHealth() {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      return {
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024),
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024)
        },
        cpu: {
          user: Math.round((cpuUsage.user / 1000000) * 100) / 100,
          system: Math.round((cpuUsage.system / 1000000) * 100) / 100
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get system health', error);
      return null;
    }
  }

  // Get performance insights
  async getPerformanceInsights() {
    try {
      const metrics = await this.getMetrics('all', '24h');
      const insights = [];

      // Analyze request performance
      if (metrics.request?.length > 0) {
        const avgResponseTime = metrics.request.reduce((sum, m) => sum + m.duration, 0) / metrics.request.length;
        const slowRequests = metrics.request.filter(m => m.duration > 2000).length;
        
        if (avgResponseTime > 1000) {
          insights.push({
            type: 'warning',
            message: `Average response time is ${Math.round(avgResponseTime)}ms (target: <1000ms)`,
            metric: 'response_time',
            value: avgResponseTime
          });
        }

        if (slowRequests > metrics.request.length * 0.1) {
          insights.push({
            type: 'error',
            message: `${slowRequests} slow requests detected (>${(slowRequests/metrics.request.length*100).toFixed(1)}% of traffic)`,
            metric: 'slow_requests',
            value: slowRequests
          });
        }
      }

      // Analyze query performance
      if (metrics.query?.length > 0) {
        const slowQueries = metrics.query.filter(m => m.duration > this.slowQueryThreshold).length;
        
        if (slowQueries > 0) {
          insights.push({
            type: 'warning',
            message: `${slowQueries} slow database queries detected`,
            metric: 'slow_queries',
            value: slowQueries
          });
        }
      }

      // Analyze cache performance
      if (metrics.cache?.length > 0) {
        const cacheHitRate = metrics.cache.filter(m => m.hit).length / metrics.cache.length;
        
        if (cacheHitRate < 0.7) {
          insights.push({
            type: 'info',
            message: `Cache hit rate is ${(cacheHitRate * 100).toFixed(1)}% (target: >70%)`,
            metric: 'cache_hit_rate',
            value: cacheHitRate
          });
        }
      }

      return insights;
    } catch (error) {
      logger.error('Failed to get performance insights', error);
      return [];
    }
  }

  // Initialize all monitoring
  initialize() {
    if (!this.enabled) {
      logger.info('Performance monitoring disabled');
      return;
    }

    logger.info('Initializing performance monitoring');
    
    this.memoryMonitoring();
    this.cpuMonitoring();
    this.cacheMonitoring();

    // Clean up old metrics periodically
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000); // Every hour
  }

  // Cleanup old metrics to prevent memory leaks
  async cleanupOldMetrics() {
    try {
      const patterns = ['metrics:request:*', 'metrics:query:*', 'metrics:api:*', 'metrics:cache:*'];
      const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

      for (const pattern of patterns) {
        const keys = await cacheService.client?.keys(pattern) || [];
        
        for (const key of keys) {
          const timestamp = parseInt(key.split(':')[2]);
          if (timestamp < cutoff) {
            await cacheService.del(key);
          }
        }
      }

      logger.debug('Cleaned up old performance metrics');
    } catch (error) {
      logger.error('Failed to cleanup old metrics', error);
    }
  }

  generateRequestId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

module.exports = new PerformanceMonitor();