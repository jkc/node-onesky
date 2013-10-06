OneSky API for Node
===========

This Node.js module provides access to the [OneSky API](http://developer.oneskyapp.com/api) for managing website translations.

Installation
----------

Install via [npm](http://npmjs.org/)

    npm install onesky --save

Usage
----------

Initialize onesky with your public and private keys.

    var onesky = require('onesky')(publicKey, privateKey);


  
###### Example calls  
  
  
*Note*: All callbacks are passed an error and data argument: `callback(err, data)`.

  
  
**Create project** with base locale `en_US`

    onesky.project.add('My app', 'en_US', callback);
    
    
    
**Fetch project**
  
    onesky.project.details('My app', callback);
    
    
    
**Add a platform** to a project

    onesky.platform.add('My app', { type: 'website' }, callback);



**Add a phrase** to a platform. Strings parameter can be an object, array of objects, string, or an array of strings
    
    var strings = [{
      string: 'My webapp is cool',
      stringKey: 'homepage.webapp_is_cool'
    }, {
      string: 'Another sentence, without a stringKey'
    }];

    onesky.string.input(platformId, strings, callback);



**Order translations**

    onesky.translate.order({
      platformId: platformId,
      agencyId: 5,
      toLocale: 'es_ES',
      filter: 'ALL'
    }, callback);
    
    

**Fetch translations**

    onesky.string.output({
      platformId: platformId,
      locale: 'es_ES'
    }, callback);
    
For additional methods, see [Onesky's documentation](http://developer.oneskyapp.com/api). All endpoints and options listed in the official API docs are available here, except string file upload and download which will be added soon.

Contribute
----------

Forks and pull requests welcome!

TODO
----------
* Add support for the string/upload and string/download API
* Add tests
* Parse OneSky's response when approriate. OneSky often returns unnecessary nesting
* Design a better way of defining API keys to allow use of multiple onesky accounts

Author
----------

Brandon Paton. Email me if you have any questions: [bp@brandonpaton.com](mailto:bp@brandonpaton.com).
