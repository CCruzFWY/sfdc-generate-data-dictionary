# <img src="https://public.gavignon.io/images/sfdc-generate-data-dictionary-title.png" height="32">

![version](https://img.shields.io/badge/version-1.2.15-blue)

Generate data dictionary from a Salesforce Org. This tool can also generate a file that can be imported in Lucidchart to define entities and relationships.

## Getting Started

Works in Unix like system. Windows is not tested.

### Installing

```
npm install -g sfdc-generate-data-dictionary
```

## Screenshots

<img src="https://public.gavignon.io/images/sfdc-generate-data-dictionary-screen1.png" width="100%">

## Usage

### Command Line

```
$ sgd -h

  Usage: sgd [options]

  Generate data dictionary from a Salesforce Org

  Options:

    -u, --username [username]                             salesforce username
    -p, --password [password]                             salesforce password
    -l, --loginUrl [loginUrl]                             salesforce login URL [https://login.salesforce.com]
    -a, --apiVersion [apiVersion]                         salesforce API Version [48.0]
    -c, --allCustomObjects [allCustomObjects]             retrieve all custom objects [true]
                                                           Use 'false' to retrieve all standard objects instead
    -m, --mergeObjects [mergeObjects]                     retrieve both custom and standard objects [false]
                                                           Combines custom and standard objects in one file
    -lc, --lucidchart [lucidchart]                        generate ERD file for Lucidchart [true]
    -s, --sobjects [sobjects]                             sObjects to retrieve separated with commas
    -D, --debug [debug]                                   generate debug log file [false]
    -d, --deleteFolders [deleteFolders]                   delete/clean temp folders [true]
    -e, --excludeManagedPackage [excludeManagedPackage]   exclude managed packaged [true]
    -ht, --hideTechFields [hideTechFields]                hide tech fields [false]
    -tp, --techFieldPrefix [techFieldPrefix]              Tech field prefix ['TECH_']
    -t, --outputTime [outputTime]                         Display Hours in the file name [false]
    -o, --output [dir]                                    salesforce data dictionary directory path [.]
```

#### Examples

**Retrieve all custom objects (default behavior):**

```
$ sgd -u "my.username@mydomain.com" -p "password" -l "https://test.salesforce.com" -c true
```

**Retrieve all standard objects:**

```
$ sgd -u "my.username@mydomain.com" -p "password" -l "https://test.salesforce.com" -c false
```

**Retrieve both custom and standard objects (merged):**

```
$ sgd -u "my.username@mydomain.com" -p "password" -l "https://test.salesforce.com" -m true
```

**Retrieve specific objects:**

```
$ sgd -u "my.username@mydomain.com" -p "password" -l "https://test.salesforce.com" --sobjects "Account,Contact,Opportunity,Case" -c false
```

**Complete example with all options:**

```
$ sgd -u "my.username@mydomain.com" -p "password" -l "https://test.salesforce.com" -m true -lc false -e false -o "./output"
```

### Module

```
  var sgd = require('sfdc-generate-data-dictionary');

  sgd({
      'username': '',
      'password': options.password,
      'loginUrl': options.loginUrl,
      'projectName': '',
      'allCustomObjects': true,
      'debug': false,
      'cleanFolders': true,
      'output':'.'
      }, console.log);
```

## Features

### Object Retrieval Modes

The tool supports three main modes for retrieving objects:

1. **Custom Objects Only** (`-c true` or default): Retrieves all custom objects (ending with `__c`) from your Salesforce org.

2. **Standard Objects Only** (`-c false`): Retrieves all standard objects that meet the following criteria:

   - `custom === false`
   - `customSetting === false`
   - `layoutable === true`
   - `createable === true`
   - `updateable === true`
   - `deletable === true`
   - `deprecatedAndHidden === false`
   - `keyPrefix !== null`
   - `queryable === true`

3. **Merged Mode** (`-m true`): Combines both custom and standard objects into a single Excel file.

### Progress Information

The tool automatically displays the number of objects found during processing:

- `Total custom objects found: X` (when using `-c true`)
- `Total standard objects found: X` (when using `-c false`)
- `Total objects found (custom + standard): X` (when using `-m true`)
- `Total objects specified: X` (when using `-s`)

### Excel Sheet Name Sanitization

Sheet names are automatically sanitized to ensure compatibility with Excel:

- Invalid characters (`: \ / ? * [ ]`) are removed
- Names are limited to 31 characters (Excel's maximum)
- Duplicate names are automatically suffixed with `_1`, `_2`, `_3`, etc.
- If a name becomes empty after sanitization, it defaults to "Sheet"

## Debugging

Since **1.0.3**, you can now run the tool in debug mode to generate a file that contains information about each step during the process.
Information contained in the debug files will be enriched following your feedback to have the most accurate information for debugging.

Please paste the content of this file in your issues to help analysis.

### Debug files location

For a local module:

```
CURRENT_DIR/node_modules/sfdc-generate-data-dictionary/files
```

Global module:

- Mac: /usr/local/lib/node_modules/sfdc-generate-data-dictionary/files
- Windows: %AppData%\npm\node_modules\sfdc-generate-data-dictionary\files

## Built With

- [commander](https://github.com/tj/commander.js/) - The complete solution for node.js command-line interfaces, inspired by Ruby's commander.
- [bytes](https://github.com/visionmedia/bytes.js) - Utility to parse a string bytes to bytes and vice-versa.
- [excel4node](https://github.com/amekkawi/excel4node) - Node module to allow for easy Excel file creation.
- [jsforce](https://github.com/jsforce/jsforce) - Salesforce API Library for JavaScript applications (both on Node.js and web browser)

## Versioning

[SemVer](http://semver.org/) is used for versioning.

## Authors

- **Gil Avignon** - _Initial work_ - [gavignon](https://github.com/gavignon)

## License

This project is licensed under the MIT License - see the <LICENSE.md> file for details
