const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const cron = require('node-cron');
const logger = require('../utils/logger');

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../../backups');
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
    this.enabled = process.env.BACKUP_ENABLED === 'true';
    this.schedule = process.env.BACKUP_SCHEDULE || '0 2 * * *'; // Daily at 2 AM
  }

  async init() {
    if (!this.enabled) {
      logger.info('Backup service disabled');
      return;
    }

    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      logger.info('Backup service initialized');

      // Schedule automated backups
      cron.schedule(this.schedule, async () => {
        logger.info('Running scheduled database backup');
        await this.createBackup();
        await this.cleanupOldBackups();
      });

      logger.info(`Backup scheduled: ${this.schedule}`);
    } catch (error) {
      logger.error('Failed to initialize backup service:', error);
    }
  }

  async createBackup() {
    if (!this.enabled) {
      throw new Error('Backup service is disabled');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.backupDir, `backup-${timestamp}.sql`);

    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'invoice_db',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'password',
    };

    return new Promise((resolve, reject) => {
      const command = `PGPASSWORD="${dbConfig.password}" pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -f "${backupFile}" --verbose`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.error('Backup failed:', error);
          reject(error);
          return;
        }

        logger.info(`Database backup created: ${backupFile}`);
        logger.debug('Backup output:', stdout);

        resolve(backupFile);
      });
    });
  }

  async restoreBackup(backupFile) {
    if (!this.enabled) {
      throw new Error('Backup service is disabled');
    }

    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'invoice_db',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'password',
    };

    return new Promise((resolve, reject) => {
      const command = `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -f "${backupFile}"`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.error('Restore failed:', error);
          reject(error);
          return;
        }

        logger.info(`Database restored from: ${backupFile}`);
        logger.debug('Restore output:', stdout);

        resolve(stdout);
      });
    });
  }

  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter((file) => file.startsWith('backup-') && file.endsWith('.sql'))
        .map((file) => ({
          filename: file,
          path: path.join(this.backupDir, file),
          timestamp: file.replace('backup-', '').replace('.sql', ''),
        }))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      return backupFiles;
    } catch (error) {
      logger.error('Failed to list backups:', error);
      return [];
    }
  }

  async cleanupOldBackups() {
    try {
      const backups = await this.listBackups();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      const filesToDelete = backups.filter((backup) => {
        const backupDate = new Date(backup.timestamp.replace(/-/g, ':'));
        return backupDate < cutoffDate;
      });

      for (const file of filesToDelete) {
        await fs.unlink(file.path);
        logger.info(`Deleted old backup: ${file.filename}`);
      }

      if (filesToDelete.length > 0) {
        logger.info(`Cleaned up ${filesToDelete.length} old backups`);
      }
    } catch (error) {
      logger.error('Failed to cleanup old backups:', error);
    }
  }

  async getBackupInfo() {
    const backups = await this.listBackups();
    const totalSize = await this.calculateBackupSize();

    return {
      enabled: this.enabled,
      schedule: this.schedule,
      retentionDays: this.retentionDays,
      backupCount: backups.length,
      totalSize,
      latestBackup: backups[0] || null,
      backupDirectory: this.backupDir,
    };
  }

  async calculateBackupSize() {
    try {
      const backups = await this.listBackups();
      let totalSize = 0;

      for (const backup of backups) {
        const stats = await fs.stat(backup.path);
        totalSize += stats.size;
      }

      return totalSize;
    } catch (error) {
      logger.error('Failed to calculate backup size:', error);
      return 0;
    }
  }
}

module.exports = new BackupService();
