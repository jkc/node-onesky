OneSky API for Node
===========

This module provides access to the [OneSky API](http://developer.oneskyapp.com/api) for managing website translations.

**Warning**: This module is in *alpha*. Future versions are likely to include breaking changes.

Installation
----------

Install via [npm](http://npmjs.org/)

    npm install onesky --save

Example usage
----------

    var privateKey = 'abc', 
        publicKey = '123';
        
    var onesky = require('onesky')(privateKey, publicKey);


**Create project** with base locale `en_US`

    onesky.project.add('My app', 'en_US', function(err, data) {
      console.log('Project created!');
    });
    
    
    
**Fetch project**
  
    onesky.project.details('My app', function(err, data) {
      console.log('Project name: ' + data.project.name);
    });
    
    
    
**Add a platform** to a project

    onesky.platform.add('My app', { type: 'website' }, function(err, data) {
      var platformId = data.platform['platform-id'];
      console.log('New platform id: ' + platformId);
    });



**Add a phrase** to a platform. Strings parameter can be an object, array of objects, string, or an array of strings
    
    var strings = [{
      string: 'My webapp is cool',
      stringKey: 'homepage.webapp_is_cool'
    }, {
      string: 'Another sentence, without a stringKey'
    }];

    onesky.string.input(platformId, strings, function() {
      console.log('Phrases uploaded!');
    });



**Order translations**

    onesky.translate.order({
      platformId: platformId,
      agencyId: 5,
      toLocale: 'es_ES',
      filter: 'ALL'
    }, function(err) {
      console.log('Translation order placed!');
    });
    
    

**Fetch translations**

    onesky.string.output({
      platformId: platformId,
      locale: 'es_ES'
    }, function(err, translations) {
      console.log('Woo, translations!');
      console.log(translations);
    });


Documentation
----------

Full documentation coming soon. Until then, reference [Onesky's docs](http://developer.oneskyapp.com/api) and the module's source. 
It should be fairly self-explanatory.

Contribute
----------

Forks and pull requests welcome!

TODO
----------
* Add support for the string/upload and string/download API
* Add tests
* Parse OneSky's response when approriate. OneSky often returns unnecessary nesting

Author
----------

Brandon Paton. Email me if you have any questions: [bp@brandonpaton.com](mailto:bp@brandonpaton.com).
