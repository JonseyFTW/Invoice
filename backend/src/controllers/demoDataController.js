const { 
  User, 
  Customer, 
  CustomerNote, 
  Property, 
  PropertyNote, 
  PropertyServiceHistory,
  Invoice, 
  InvoiceLineItem, 
  Expense,
  RecurringTemplate,
  sequelize 
} = require('../models');
const bcrypt = require('bcryptjs');
const { format, subDays, subMonths, addDays } = require('date-fns');

// Demo data templates
const demoCustomers = [
  {
    name: 'Greenfield Property Management',
    email: 'contact@greenfieldpm.com',
    phone: '(555) 123-4567',
    billingAddress: '123 Business Park Dr\nAustin, TX 78701',
    notes: 'Primary property management partner. Handles 15+ residential properties in Austin area.'
  },
  {
    name: 'Johnson Family Trust',
    email: 'trust@johnsonfamily.com',
    phone: '(555) 234-5678',
    billingAddress: '456 Oak Street\nAustin, TX 78702',
    notes: 'Family trust managing inherited rental properties. Very responsive to maintenance requests.'
  },
  {
    name: 'Austin Rental Ventures LLC',
    email: 'operations@austinrental.com',
    phone: '(555) 345-6789',
    billingAddress: '789 Cedar Lane\nAustin, TX 78703',
    notes: 'Growing rental company. Focuses on mid-range properties. Quick payment terms.'
  },
  {
    name: 'Heritage Property Group',
    email: 'maintenance@heritageprops.com',
    phone: '(555) 456-7890',
    billingAddress: '321 Heritage Blvd\nAustin, TX 78704',
    notes: 'Manages historic properties. Requires specialized maintenance approaches.'
  },
  {
    name: 'Modern Living Properties',
    email: 'service@modernliving.com',
    phone: '(555) 567-8901',
    billingAddress: '654 Innovation Way\nAustin, TX 78705',
    notes: 'Tech-focused property management. All communication through digital channels.'
  }
];

const demoProperties = [
  // Greenfield Property Management properties
  {
    name: 'Riverside Cottage',
    address: '1234 Riverside Dr',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    propertyType: 'residential',
    gateCode: '',
    keyLocation: 'Under front door mat',
    accessNotes: 'Tenant works from home, call ahead. Dog friendly - golden retriever named Max.',
    latitude: '30.2672',
    longitude: '-97.7431'
  },
  {
    name: 'Downtown Duplex Unit A',
    address: '567 Congress Ave Unit A',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    propertyType: 'residential',
    gateCode: '1234',
    keyLocation: 'Lockbox by front door - code 5678',
    accessNotes: 'Recently renovated. Tenant travels frequently. Use side entrance.',
    latitude: '30.2667',
    longitude: '-97.7420'
  },
  {
    name: 'Eastside Bungalow',
    address: '890 E 6th St',
    city: 'Austin',
    state: 'TX',
    zipCode: '78702',
    propertyType: 'residential',
    gateCode: '',
    keyLocation: 'Spare key with neighbor at 892 E 6th St',
    accessNotes: 'Historic property - be careful with original hardwood floors. No pets.',
    latitude: '30.2669',
    longitude: '-97.7300'
  },
  // Johnson Family Trust properties
  {
    name: 'Oak Hill Family Home',
    address: '456 Oak Hill Dr',
    city: 'Austin',
    state: 'TX',
    zipCode: '78749',
    propertyType: 'residential',
    gateCode: '',
    keyLocation: 'Hidden under large flower pot by garage',
    accessNotes: 'Family with young children. Best access times: 9AM-3PM weekdays.',
    latitude: '30.2200',
    longitude: '-97.8000'
  },
  {
    name: 'Westlake Townhome',
    address: '789 Westlake Dr',
    city: 'Austin',
    state: 'TX',
    zipCode: '78746',
    propertyType: 'residential',
    gateCode: '9876',
    keyLocation: 'Property manager has key - call ahead',
    accessNotes: 'High-end property. Remove shoes inside. Alarm system - code 1111.',
    latitude: '30.3000',
    longitude: '-97.8200'
  },
  // Austin Rental Ventures properties
  {
    name: 'Student Housing Complex Building C',
    address: '321 University Blvd Unit C',
    city: 'Austin',
    state: 'TX',
    zipCode: '78705',
    propertyType: 'residential',
    gateCode: '2468',
    keyLocation: 'Office has master key',
    accessNotes: 'Student housing - multiple tenants. Schedule during business hours.',
    latitude: '30.2849',
    longitude: '-97.7341'
  },
  {
    name: 'South Austin Condo',
    address: '654 South Lamar Blvd',
    city: 'Austin',
    state: 'TX',
    zipCode: '78704',
    propertyType: 'residential',
    gateCode: '3579',
    keyLocation: 'Concierge desk in lobby',
    accessNotes: 'Condo building - check in with concierge. Parking validation available.',
    latitude: '30.2400',
    longitude: '-97.7700'
  },
  // Heritage Property Group properties
  {
    name: 'Historic Hyde Park Home',
    address: '987 Avenue B',
    city: 'Austin',
    state: 'TX',
    zipCode: '78751',
    propertyType: 'residential',
    gateCode: '',
    keyLocation: 'Victorian-era lockbox by side gate',
    accessNotes: 'Historic designation - any exterior work needs city approval. Very quiet neighborhood.',
    latitude: '30.3100',
    longitude: '-97.7250'
  },
  // Modern Living Properties
  {
    name: 'Smart Home Alpha',
    address: '147 Future Lane',
    city: 'Austin',
    state: 'TX',
    zipCode: '78759',
    propertyType: 'residential',
    gateCode: '',
    keyLocation: 'Smart lock - code sent via app',
    accessNotes: 'Fully automated smart home. All systems controllable via mobile app. Tech-savvy tenant.',
    latitude: '30.4000',
    longitude: '-97.7100'
  },
  {
    name: 'Modern Loft Downtown',
    address: '258 Rainey St',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    propertyType: 'residential',
    gateCode: '7890',
    keyLocation: 'Smart lockbox - code 4321',
    accessNotes: 'High-rise building. Valet parking available. Modern finishes throughout.',
    latitude: '30.2600',
    longitude: '-97.7380'
  }
];

const serviceTypes = [
  'painting', 'repair', 'maintenance', 'inspection', 'estimate', 
  'consultation', 'cleanup', 'preparation', 'other'
];

const repairDescriptions = {
  painting: [
    'Painted bedroom walls',
    'Touch-up paint throughout',
    'Painted front door',
    'Fixed wall holes and painted',
    'Painted bathroom ceiling',
    'Exterior trim painting',
    'Painted kitchen cabinets'
  ],
  repair: [
    'Fixed leaky kitchen faucet',
    'Replaced faulty outlet',
    'Fixed heating unit',
    'Replaced damaged tiles',
    'Fixed front door lock',
    'Repaired fence gate',
    'Fixed garage door opener'
  ],
  maintenance: [
    'Replaced air filter',
    'Cleaned AC coils',
    'Cleaned dryer vent',
    'Replaced smoke detector',
    'Caulked bathroom tiles',
    'Cleaned gutters',
    'Lubricated door hinges'
  ],
  inspection: [
    'Annual safety inspection',
    'HVAC system inspection',
    'Electrical panel inspection',
    'Plumbing system check',
    'Roof condition assessment',
    'Foundation inspection',
    'Fire safety inspection'
  ],
  estimate: [
    'Kitchen renovation estimate',
    'Bathroom remodel estimate',
    'Exterior painting estimate',
    'Flooring replacement estimate',
    'Roofing repair estimate',
    'Electrical upgrade estimate',
    'Plumbing renovation estimate'
  ],
  consultation: [
    'Color selection consultation',
    'Material recommendation',
    'Project planning meeting',
    'Budget planning session',
    'Timeline discussion',
    'Design consultation',
    'Technical advisory'
  ],
  cleanup: [
    'Post-project cleanup',
    'Paint overspray removal',
    'Debris removal',
    'Deep cleaning service',
    'Equipment removal',
    'Site restoration',
    'Final walkthrough cleanup'
  ],
  preparation: [
    'Surface preparation',
    'Masking and protection',
    'Material staging',
    'Site setup',
    'Tool preparation',
    'Area protection',
    'Safety setup'
  ],
  other: [
    'General maintenance service',
    'Emergency repair',
    'Custom service request',
    'Special project work',
    'Seasonal maintenance',
    'Preventive service',
    'Follow-up service'
  ]
};

const expenseCategories = [
  'materials', 'fuel', 'tools', 'permits', 'subcontractor', 'equipment_rental', 'supplies'
];

const materialItems = [
  'PVC pipe fittings', 'Electrical wire', 'Paint and primer', 'Tiles and grout', 
  'Light fixtures', 'Faucet parts', 'Screws and fasteners', 'Drywall compound',
  'Air filters', 'Plumbing fixtures', 'Electrical outlets', 'Wood stain'
];

exports.generateDemoData = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Starting demo data generation...');

    // Clear existing data first (except users)
    await clearNonUserData(transaction);

    // Create customers
    console.log('Creating customers...');
    const customers = [];
    for (const customerData of demoCustomers) {
      const customer = await Customer.create(customerData, { transaction });
      customers.push(customer);
    }

    // Create properties and associate with customers
    console.log('Creating properties...');
    const properties = [];
    for (let i = 0; i < demoProperties.length; i++) {
      const propertyData = demoProperties[i];
      const customer = customers[Math.floor(i / 2)]; // 2 properties per customer
      
      const property = await Property.create({
        ...propertyData,
        customerId: customer.id
      }, { transaction });
      properties.push(property);
    }

    // Create customer notes
    console.log('Creating customer notes...');
    for (const customer of customers) {
      const noteCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < noteCount; i++) {
        const noteText = generateCustomerNote();
        await CustomerNote.create({
          customerId: customer.id,
          title: noteText.split('.')[0] + '.',
          content: noteText,
          category: ['paint_codes', 'materials', 'preferences', 'access_info', 'special_instructions'][Math.floor(Math.random() * 5)]
        }, { transaction });
      }
    }

    // Create property notes
    console.log('Creating property notes...');
    for (const property of properties) {
      const noteCount = Math.floor(Math.random() * 4) + 1;
      for (let i = 0; i < noteCount; i++) {
        const noteText = generatePropertyNote();
        await PropertyNote.create({
          propertyId: property.id,
          title: noteText.split('.')[0] + '.',
          content: noteText,
          category: ['access_info', 'special_instructions', 'maintenance_history', 'client_preferences'][Math.floor(Math.random() * 4)]
        }, { transaction });
      }
    }

    // Create invoices with line items
    console.log('Creating invoices...');
    const invoices = [];
    for (let i = 0; i < 45; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const customerProperties = properties.filter(p => p.customerId === customer.id);
      const property = customerProperties[Math.floor(Math.random() * customerProperties.length)];
      
      const invoiceDate = subDays(new Date(), Math.floor(Math.random() * 365));
      const dueDate = addDays(invoiceDate, 30);
      
      const invoice = await Invoice.create({
        invoiceNumber: `INV-${String(2024000 + i).padStart(7, '0')}`,
        customerId: customer.id,
        propertyId: property ? property.id : null,
        invoiceDate,
        dueDate,
        taxRate: 8.25,
        status: generateInvoiceStatus(invoiceDate),
        notes: generateInvoiceNotes(),
        paymentDate: Math.random() > 0.6 ? addDays(invoiceDate, Math.floor(Math.random() * 45)) : null
      }, { transaction });
      
      invoices.push(invoice);

      // Create line items for each invoice
      const lineItemCount = Math.floor(Math.random() * 4) + 1;
      for (let j = 0; j < lineItemCount; j++) {
        const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
        const description = repairDescriptions[serviceType] ? 
          repairDescriptions[serviceType][Math.floor(Math.random() * repairDescriptions[serviceType].length)] :
          'General maintenance service';
        
        const quantity = Math.random() > 0.8 ? Math.floor(Math.random() * 3) + 2 : 1;
        const unitPrice = generateServicePrice(serviceType);
        
        await InvoiceLineItem.create({
          invoiceId: invoice.id,
          description,
          quantity,
          unitPrice,
          lineTotal: quantity * unitPrice
        }, { transaction });
      }
    }

    // Create property service history
    console.log('Creating service history...');
    for (const property of properties) {
      const serviceCount = Math.floor(Math.random() * 8) + 2;
      for (let i = 0; i < serviceCount; i++) {
        const serviceDate = subDays(new Date(), Math.floor(Math.random() * 180));
        const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
        const description = repairDescriptions[serviceType] ? 
          repairDescriptions[serviceType][Math.floor(Math.random() * repairDescriptions[serviceType].length)] :
          'General maintenance service';
        
        const totalCost = generateServicePrice(serviceType);
        const relatedInvoice = invoices.find(inv => inv.propertyId === property.id && Math.abs(new Date(inv.invoiceDate) - serviceDate) < 7 * 24 * 60 * 60 * 1000);
        
        await PropertyServiceHistory.create({
          propertyId: property.id,
          invoiceId: relatedInvoice ? relatedInvoice.id : null,
          serviceDate,
          serviceType,
          description,
          totalCost,
          timeSpent: Math.floor(Math.random() * 6) + 1,
          customerSatisfaction: Math.floor(Math.random() * 2) + 4, // 4-5 stars
          followUpRequired: Math.random() > 0.8,
          followUpDate: Math.random() > 0.8 ? addDays(serviceDate, Math.floor(Math.random() * 30) + 7) : null,
          notes: generateServiceNotes(serviceType)
        }, { transaction });
      }
    }

    // Create expenses
    console.log('Creating expenses...');
    for (let i = 0; i < 85; i++) {
      const category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
      const expenseDate = subDays(new Date(), Math.floor(Math.random() * 365));
      
      await Expense.create({
        description: generateExpenseDescription(category),
        amount: generateExpenseAmount(category),
        category,
        expenseDate,
        vendor: generateVendorName(category),
        receiptPath: null,
        notes: Math.random() > 0.7 ? generateExpenseNotes(category) : null
      }, { transaction });
    }

    // Create recurring templates
    console.log('Creating recurring templates...');
    for (let i = 0; i < 3; i++) {
      const customer = customers[i];
      const startDate = subMonths(new Date(), 2);
      const nextRun = addDays(new Date(), Math.floor(Math.random() * 30));
      
      await RecurringTemplate.create({
        templateName: `Monthly ${customer.name} Maintenance`,
        customerId: customer.id,
        frequency: 'MONTHLY',
        startDate,
        nextRunDate: nextRun,
        baseInvoiceData: {
          lineItems: [
            {
              description: 'Monthly maintenance service',
              quantity: 1,
              unitPrice: 150,
              lineTotal: 150
            }
          ],
          notes: 'Regular monthly maintenance service'
        },
        taxRate: 8.25,
        isActive: true
      }, { transaction });
    }

    await transaction.commit();
    console.log('Demo data generation completed successfully!');

    res.json({
      success: true,
      message: 'Demo data generated successfully',
      data: {
        customers: customers.length,
        properties: properties.length,
        invoices: invoices.length,
        expenses: 85,
        serviceRecords: properties.length * 5 // approximate
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error generating demo data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate demo data',
      error: error.message
    });
  }
};

exports.clearDemoData = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Clearing demo data...');
    
    await clearNonUserData(transaction);
    
    await transaction.commit();
    console.log('Demo data cleared successfully!');

    res.json({
      success: true,
      message: 'Demo data cleared successfully'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error clearing demo data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear demo data',
      error: error.message
    });
  }
};

// Helper function to clear all non-user data
async function clearNonUserData(transaction) {
  // Delete in correct order to respect foreign key constraints
  await InvoiceLineItem.destroy({ where: {}, transaction });
  await PropertyServiceHistory.destroy({ where: {}, transaction });
  await Invoice.destroy({ where: {}, transaction });
  await Expense.destroy({ where: {}, transaction });
  await RecurringTemplate.destroy({ where: {}, transaction });
  await PropertyNote.destroy({ where: {}, transaction });
  await Property.destroy({ where: {}, transaction });
  await CustomerNote.destroy({ where: {}, transaction });
  await Customer.destroy({ where: {}, transaction });
}

// Helper functions to generate realistic data
function generateCustomerNote() {
  const notes = [
    'Prefers email communication over phone calls',
    'Payment terms: Net 30 days, very reliable payer',
    'Has multiple properties in portfolio, expanding rapidly',
    'Requires detailed invoices with photos for insurance purposes',
    'Prefers services scheduled between 9 AM - 4 PM',
    'Emergency contact: Property manager available 24/7',
    'Tenant communication should go through property manager only',
    'Budget conscious but understands quality work costs more'
  ];
  return notes[Math.floor(Math.random() * notes.length)];
}

function generatePropertyNote() {
  const notes = [
    'Main water shutoff located in utility closet',
    'Tenant has small dog - very friendly',
    'Recently updated electrical panel - all up to code',
    'HVAC system serviced quarterly by ABC Heating',
    'Hardwood floors - no heavy equipment without protection',
    'Security system installed - disarm code provided separately',
    'Parking: use driveway, street parking after 6 PM only',
    'Property has Ring doorbell - tenant will see arrival'
  ];
  return notes[Math.floor(Math.random() * notes.length)];
}

function generateInvoiceStatus(invoiceDate) {
  const daysSinceInvoice = Math.floor((new Date() - invoiceDate) / (1000 * 60 * 60 * 24));
  
  if (Math.random() > 0.7) return 'Paid';
  if (daysSinceInvoice > 60) return 'Overdue';
  if (daysSinceInvoice > 30) return Math.random() > 0.5 ? 'Overdue' : 'Unpaid';
  return 'Unpaid';
}

function generateInvoiceNotes() {
  const notes = [
    'Work completed during normal business hours',
    'All materials included in line item costs',
    'Follow-up inspection recommended in 30 days',
    'Warranty: 90 days on labor, manufacturer warranty on parts',
    'Emergency repair - completed same day',
    'Coordinated with tenant schedule for minimal disruption',
    null, null // 25% chance of no notes
  ];
  return notes[Math.floor(Math.random() * notes.length)];
}

function generateServicePrice(serviceType) {
  const basePrices = {
    painting: [180, 850],
    repair: [85, 450],
    maintenance: [120, 350],
    inspection: [75, 200],
    estimate: [0, 150],
    consultation: [50, 250],
    cleanup: [100, 300],
    preparation: [80, 250],
    other: [65, 280]
  };
  
  const range = basePrices[serviceType] || [50, 300];
  return Math.floor(Math.random() * (range[1] - range[0]) + range[0]);
}

function generateServiceNotes(serviceType) {
  const notes = {
    painting: ['Used premium paint for durability', 'Two coats applied for best coverage', 'Touch-up paint left with tenant'],
    repair: ['All work up to manufacturer specifications', 'Tested functionality after repair', 'Replacement parts warrantied'],
    maintenance: ['System running at optimal efficiency', 'Scheduled next maintenance', 'All components inspected'],
    inspection: ['Comprehensive inspection completed', 'All systems functioning properly', 'Recommendations provided'],
    estimate: ['Detailed estimate provided', 'Multiple options presented', 'Timeline discussed'],
    consultation: ['Professional advice provided', 'Solutions recommended', 'Next steps outlined'],
    cleanup: ['Site left clean and tidy', 'All debris removed', 'Area restored to original condition'],
    preparation: ['Site properly prepared', 'All surfaces protected', 'Materials staged for efficiency'],
    other: ['Work completed to specifications', 'All hardware secured', 'Quality check performed']
  };
  
  const serviceNotes = notes[serviceType] || notes.other;
  return Math.random() > 0.3 ? serviceNotes[Math.floor(Math.random() * serviceNotes.length)] : null;
}

function generateExpenseDescription(category) {
  const descriptions = {
    materials: materialItems,
    fuel: ['Gas for service truck', 'Fuel for generator', 'Vehicle fuel costs'],
    tools: ['Drill bits and saw blades', 'Hand tools replacement', 'Power tool maintenance'],
    permits: ['City building permit', 'Electrical work permit', 'Plumbing permit fee'],
    subcontractor: ['Licensed electrician services', 'Specialized plumbing work', 'HVAC technician call'],
    equipment_rental: ['Carpet cleaner rental', 'Floor refinishing equipment', 'Pressure washer rental'],
    supplies: ['Cleaning supplies', 'Safety equipment', 'Shop consumables']
  };
  
  const items = descriptions[category] || ['General supplies'];
  return items[Math.floor(Math.random() * items.length)];
}

function generateExpenseAmount(category) {
  const ranges = {
    materials: [15, 180],
    fuel: [25, 85],
    tools: [35, 250],
    permits: [45, 120],
    subcontractor: [150, 650],
    equipment_rental: [75, 200],
    supplies: [20, 95]
  };
  
  const range = ranges[category] || [20, 100];
  return Math.floor(Math.random() * (range[1] - range[0]) + range[0]);
}

function generateVendorName(category) {
  const vendors = {
    materials: ['Home Depot', 'Lowes', 'Local Hardware Store', 'Plumbing Supply Co'],
    fuel: ['Shell', 'Exxon', 'Chevron', 'Local Gas Station'],
    tools: ['Harbor Freight', 'Home Depot', 'Tool Supply Store'],
    permits: ['City of Austin', 'Travis County', 'Local Municipality'],
    subcontractor: ['ABC Electric', 'Quality Plumbing', 'Austin HVAC Pro'],
    equipment_rental: ['United Rentals', 'Tool Rental Plus', 'Equipment Express'],
    supplies: ['Cleaning Supply Co', 'Safety First Supply', 'Local Supply Store']
  };
  
  const vendorList = vendors[category] || ['General Vendor'];
  return vendorList[Math.floor(Math.random() * vendorList.length)];
}

function generateExpenseNotes(category) {
  const notes = [
    'Receipts filed in accounting folder',
    'Emergency purchase for urgent repair',
    'Bulk purchase for better pricing',
    'Required for code compliance',
    'Warranty included with purchase'
  ];
  return notes[Math.floor(Math.random() * notes.length)];
}