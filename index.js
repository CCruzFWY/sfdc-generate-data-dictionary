'use strict';
const jsforce = require('jsforce');
const Downloader = require('./lib/downloader.js');
const ExcelBuilder = require('./lib/excelbuilder.js');
const Utils = require('./lib/utils.js');

module.exports = (config, logger) => {



  // Check all mandatory config options
  if (typeof config.username === 'undefined' || config.username === null ||
    typeof config.password === 'undefined' || config.password === null) {
    throw new Error('Not enough config options');
  }

  // Set default values
  if (typeof config.loginUrl === 'undefined' || config.loginUrl === null) {
    config.loginUrl = 'https://login.salesforce.com';
  }
  if (typeof config.apiVersion === 'undefined' || config.apiVersion === null) {
    config.apiVersion = '48.0';
  }
  if (typeof config.output === 'undefined' || config.output === null) {
    config.output = '.';
  }
  if (typeof config.debug === 'undefined' || config.debug === null) {
    config.debug = false;
  }
  config.debug = (config.debug === "true" || config.debug === true);

  if (typeof config.excludeManagedPackage === 'undefined' || config.excludeManagedPackage === null) {
    config.excludeManagedPackage = true;
  }
  config.excludeManagedPackage = (config.excludeManagedPackage === "true" || config.excludeManagedPackage === true);

  if (typeof config.projectName === 'undefined' || config.projectName === null) {
    config.projectName = 'PROJECT';
  }
  if (typeof config.outputTime === 'undefined' || config.outputTime === null) {
    config.outputTime = false;
  }
  // Handle allCustomObjects conversion
  // Commander.js may pass boolean true/false or string "true"/"false"
  if (typeof config.allCustomObjects === 'undefined' || config.allCustomObjects === null) {
    config.allCustomObjects = true;
  } else if (typeof config.allCustomObjects === 'string') {
    // Convert string "true"/"false" to boolean (case-insensitive)
    const lowerValue = config.allCustomObjects.toLowerCase().trim();
    config.allCustomObjects = (lowerValue === "true" || lowerValue === "1" || lowerValue === "yes");
  } else if (typeof config.allCustomObjects === 'boolean') {
    // Already a boolean, keep as is
    config.allCustomObjects = config.allCustomObjects;
  } else {
    // For any other case, try to convert or default to true
    config.allCustomObjects = Boolean(config.allCustomObjects);
  }

  // Handle mergeObjects conversion
  if (typeof config.mergeObjects === 'undefined' || config.mergeObjects === null) {
    config.mergeObjects = false;
  } else if (typeof config.mergeObjects === 'string') {
    // Convert string "true"/"false" to boolean (case-insensitive)
    const lowerValue = config.mergeObjects.toLowerCase().trim();
    config.mergeObjects = (lowerValue === "true" || lowerValue === "1" || lowerValue === "yes");
  } else if (typeof config.mergeObjects === 'boolean') {
    // Already a boolean, keep as is
    config.mergeObjects = config.mergeObjects;
  } else {
    // For any other case, try to convert or default to false
    config.mergeObjects = Boolean(config.mergeObjects);
  }

  if (typeof config.lucidchart === 'undefined' || config.lucidchart === null) {
    config.lucidchart = true;
  }
  config.lucidchart = (config.lucidchart === "true" || config.lucidchart === true);

  // Track if sobjects was explicitly specified
  const sobjectsSpecified = typeof config.sobjects !== 'undefined' && config.sobjects !== null;
  
  if (!sobjectsSpecified) {
    config.objects = [];
  } else {
    // If an array is passed to the module
    if (Array.isArray(config.sobjects)) {
      config.objects = config.sobjects;
    } else {
      // Check and parse standObjects string for command-line
      try {
        config.objects = config.sobjects.split(',');
      } catch (e) {
        let errorMessage = 'Unable to parse sobjects parameter';
        if (config.debug)
          errorMessage += ' : ' + e;
        throw new Error(errorMessage);
      }
    }
  }


  if (typeof config.techFieldPrefix === 'undefined' || config.techFieldPrefix === null) {
    config.techFieldPrefix = 'TECH_';
  }
  if (typeof config.hideTechFields === 'undefined' || config.hideTechFields === null) {
    config.hideTechFields = false;
  }
  if (typeof config.columns === 'undefined' || config.columns === null) {
    config.columns = {
      'ReadOnly': 5,
      'Mandatory': 3,
      'Name': 25,
      'Description': 90,
      'Helptext': 90,
      'APIName': 25,
      'Type': 27,
      'Values': 45
    };
  }

  var utils = new Utils();

  // Clean folders that contain API files
  if (config.cleanFolders) {
    const statusRmDescribe = utils.rmDir(__dirname + '/files/describe', '.json', false);
    const statusRmMetadata = utils.rmDir(__dirname + '/files/metadata', '.json', false);
    logger('File folders cleaned');
  }

  // Main promise
  const promise = new Promise((resolve, reject) => {

    const conn = new jsforce.Connection({
      loginUrl: config.loginUrl,
      version: config.apiVersion
    });

    // Salesforce connection
    conn.login(config.username, config.password).then(result => {
      logger('Connected as ' + config.username);
      if (config.debug) {
        utils.log('Connected as ' + config.username, config);
      }

      if (config.mergeObjects) {
        // When mergeObjects is true, retrieve both custom and standard objects
        conn.describeGlobal().then(res => {
          // Initialize with empty array
          config.objects = [];
          
          for (let i = 0; i < res.sobjects.length; i++) {
            let object = res.sobjects[i];
            
            // Add custom objects
            if (object.custom && (object.name.indexOf('__c') !== -1)) {
              if (config.debug)
                utils.log('# excludeManagedPackage (' + config.excludeManagedPackage + '): ' + object.name, config);

              if (config.excludeManagedPackage) {
                if ((object.name.split('__').length - 1 < 2))
                  config.objects.push(object.name);
              } else {
                config.objects.push(object.name);
              }
            }
            
            // Add standard objects
            if (object.name.indexOf('__c') === -1) {
              // Only include objects that meet all standard object criteria
              if (object.custom === false &&
                  object.customSetting === false &&
                  object.layoutable === true &&
                  object.createable === true &&
                  object.updateable === true &&
                  object.deletable === true &&
                  object.deprecatedAndHidden === false &&
                  object.keyPrefix !== null &&
                  object.queryable === true) {
                if (config.debug)
                  utils.log('# Standard object found: ' + object.name + ' (custom: ' + object.custom + ')', config);
                config.objects.push(object.name);
              }
            }
          }

          logger('Total objects found (custom + standard): ' + config.objects.length);
          if (config.debug) {
            utils.log('Total objects found (custom + standard): ' + config.objects.length, config);
            utils.log(JSON.stringify(config.objects), config);
          }

          if (config.objects.length > 0) {
            const downloader = new Downloader(config, logger, conn);
            const builder = new ExcelBuilder(config, logger);

            // Download metadata files
            downloader.execute().then(result => {
              logger(result + ' downloaded');
              // Generate the excel file
              return builder.generate();
            }).then(result => {
              resolve();
            }).catch(err => {
              logger('Error during download/generation: ' + err);
              if (config.debug) {
                utils.log(err, config);
              }
              reject(err);
            });
          } else {
            resolve();
          }
        }).catch(err => {
          logger('Error during describeGlobal: ' + err);
          if (config.debug) {
            utils.log(err, config);
          }
          reject(err);
        });
      } else if (config.allCustomObjects) {
        conn.describeGlobal().then(res => {
          for (let i = 0; i < res.sobjects.length; i++) {
            let object = res.sobjects[i];
            if (config.objects === undefined)
              config.objects = [];

            // If the sObject is a real custom object
            if (object.custom && (object.name.indexOf('__c') !== -1)) {
              if (config.debug)
                utils.log('# excludeManagedPackage (' + config.excludeManagedPackage + '): ' + object.name, config);

              if (config.excludeManagedPackage) {
                if ((object.name.split('__').length - 1 < 2))
                  config.objects.push(object.name);
              } else {
                config.objects.push(object.name);
              }
            }
          }

          logger('Total custom objects found: ' + config.objects.length);
          if (config.debug)
            utils.log(JSON.stringify(config.objects), config);

          const downloader = new Downloader(config, logger, conn);
          const builder = new ExcelBuilder(config, logger);

          // Download metadata files
          downloader.execute().then(result => {
            logger(result + ' downloaded');
            // Generate the excel file
            builder.generate().then(result => {
              resolve();
            });
          })
        });
      } else {
        // When allCustomObjects is false
        if (!sobjectsSpecified) {
          // If sobjects was not specified, search for all standard objects
          conn.describeGlobal().then(res => {
            // Initialize with empty array to replace default objects
            config.objects = [];
            for (let i = 0; i < res.sobjects.length; i++) {
              let object = res.sobjects[i];
              
              // If the sObject is a standard object (doesn't contain __c in the name)
              // The most reliable way to identify standard objects is by checking if the name contains __c
              if (object.name.indexOf('__c') === -1) {
                // Only include objects that meet all standard object criteria
                if (object.custom === false &&
                    object.customSetting === false &&
                    object.layoutable === true &&
                    object.createable === true &&
                    object.updateable === true &&
                    object.deletable === true &&
                    object.deprecatedAndHidden === false &&
                    object.keyPrefix !== null &&
                    object.queryable === true) {
                  if (config.debug)
                    utils.log('# Standard object found: ' + object.name + ' (custom: ' + object.custom + ')', config);
                  config.objects.push(object.name);
                }
              }
            }

            logger('Total standard objects found: ' + config.objects.length);
            if (config.debug) {
              utils.log('Total standard objects found: ' + config.objects.length, config);
              utils.log(JSON.stringify(config.objects), config);
            }

            if (config.objects.length > 0) {
              const downloader = new Downloader(config, logger, conn);
              const builder = new ExcelBuilder(config, logger);

              // Download metadata files
              downloader.execute().then(result => {
                logger(result + ' downloaded');
                // Generate the excel file
                return builder.generate();

              }).then(result => {
                resolve();
              }).catch(err => {
                logger('Error during download/generation: ' + err);
                if (config.debug) {
                  utils.log(err, config);
                }
                reject(err);
              });
            } else {
              logger('No standard objects found. Please check your org configuration.');
              resolve();
            }
          }).catch(err => {
            logger('Error during describeGlobal: ' + err);
            if (config.debug) {
              utils.log(err, config);
            }
            reject(err);
          });
        } else {
          // If sobjects was specified, use only those objects
          logger('Total objects specified: ' + config.objects.length);
          if (config.objects.length > 0) {
            const downloader = new Downloader(config, logger, conn);
            const builder = new ExcelBuilder(config, logger);

            // Download metadata files
            downloader.execute().then(result => {
              logger(result + ' downloaded');
              // Generate the excel file
              return builder.generate();

            }).then(result => {
              resolve();
            });
          } else {
            resolve();
          }
        }
      }
    }).catch(reject);
  });
  return promise;
};
