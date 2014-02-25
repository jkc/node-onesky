var _               = require('underscore'),
    request         = require('request'),
    crypto          = require('crypto'),
    fs              = require('fs'),
    util = require('util');

var apiRoot = 'https://api.oneskyapp.com/2/';

module.exports = function(publicKey, privateKey) {

  // Create options object for request
  var createRequestOptions = function(method, path, data) {

    var time = Math.floor(Date.now() / 1000);
    var devHash = crypto.createHash('md5').update(time + privateKey).digest('hex');

    var retval = {
      method: method,
      uri: apiRoot + path,
      qs: {
        'api-key': publicKey,
        'dev-hash': devHash,
        'timestamp': time
      }
    };

    // Add data. If no data was passed this is likely an upload which requires the data to be passed as a form which
    // is handled elsewhere. Having a defined json property (even null) causes problems with this.
    if (!data) {
        if (method === 'POST') retval.json = data;
        else retval.qs = _.extend(retval.qs, data);
    }
    return retval;
  };

  // Handle callback from request
  var responseHandler = function(cb) {
    return function(err, res, body) {
      if (!cb) return;
      
      // Catch connection errors
      if (err || !res) {
        var returnErr = 'Error connecting to OneSky';
        if (err) returnErr += ': ' + err.code;
        err = returnErr;
      } else if (res.statusCode !== 200) {
        err = 'Something went wrong. Server responded with a ' + res.statusCode;
      }
      if (err) return cb(err, null);
 
      // Catch parse error
      try {
        if (typeof body !== 'object') {
          body = JSON.parse(body);
        }
      } catch(e) {
        err = 'Could not parse response from OneSky: ' + util.inspect(body);
        return cb(err, null);
      }

      // Catch onesky errors
      if (body.error || body.response === 'error') {
        err = 'Error from OneSky';
        if (body.error) err += ': ' + body.error;
        return cb(err, null)
      }

      // Return OneSky response
      cb(null, body);
    };
  };

  // Helpers
  var get  = function(path, data, cb) { request(createRequestOptions('GET', path, data), responseHandler(cb)); };
  var post = function(path, data, cb) { request(createRequestOptions('POST', path, data), responseHandler(cb)); };
  var upload = function(path, data, cb) {
    var r = request(createRequestOptions('POST', path, null), responseHandler(cb)),
        form = r.form();
    for (var dataKey in data) {
      form.append(dataKey, data[dataKey]);
    }
  };
  var removeUndefined = function(obj) {
    for (i in obj) if (obj[i] === undefined) delete obj[i];
    return obj;
  };

  // Prepare methods obj
  var methods = {
    project: {},
    string: {},
    translate: {},
    stringAccess: {},
    platform: {},
    translator: {},
    sso: {}
  };

  ////
  ////  Project Management API
  ////

  // Get projects
  methods.projects = function(cb) {
    get('projects', {}, cb);
  };

  // Get platforms
  methods.project.platforms = function(project, cb) {
    get('project/platforms', { project: project }, cb);
  };

  // Add project
  methods.project.add = function(name, baseLocale, cb) {
    post('project/add', { name: name, 'base-locale': baseLocale }, cb);
  };

  // Get project details
  methods.project.details = function(project, cb) {
    get('project/details', { project: project }, cb);
  };

  // Modify project
  methods.project.modify = function(project, newName, cb) {
    post('project/modify', { project: project, 'new-name': newName }, cb);
  };

  // Delete project
  methods.project.del = function(project, cb) {
    post('project/delete', { project: project }, cb);
  };

  // TODO: make sure all input accept passing platform-id and not only camel case

  ////
  ////  Translation I/O API
  ////
  
  // Input translation
  // - strings param accepts a String, an Object of a single string, 
  //   or an Array of strings of type Object or String
  // - Method will automatically set string-key as the string if not
  //   specified due to a bug in onesky api preventing deletion of
  //   phrases with no string-key
  methods.string.input = function(data, strings, cb) {
    // Parse strings
    if (!_.isArray(strings)) strings = [strings]; 
    strings = strings.map(function(string) {
      if (typeof string === 'string') string = { string: string };
      if (!string['string-key']) {
        string['string-key'] = string.stringKey || string.string;
        delete string.stringKey;
      }
      return string;
    });

    // Parse data
    var postData = { input: JSON.stringify(strings) };
    if (typeof data !== 'object') postData['platform-id'] = data;
    else {
      _.extend(postData, removeUndefined({
        'platform-id': data.platformId || data['platform-id'],
        version: data.version,
        tag: data.tag,
        'is-allow-update': data.isAllowUpdate || data['is-allow-update']
      }));
    }

    post('string/input', postData, cb);
  };


  // Translate string
  // - Context is required if context is defined on phrase
  methods.string.translate = function(data, cb) {
    data = removeUndefined({
      'platform-id': data.platformId || data['platform-id'],
      'string-key': data.stringKey || data['string-key'],
      context: data.context,
      locale: data.locale,
      translation: data.translation
    });
    post('string/translate', data, cb);
  };

  // Output translations
  methods.string.output = function(data, cb) {
    data = removeUndefined({
      'platform-id': data.platformId || data['platform-id'],
      locale: data.locale,
      tag: data.tag,
      md5: data.md5,
      version: data.version,
      'is-fallback': data.isFallback || data['is-fallback']
    });
    post('string/output', data, cb);
  };


  // Delete phrase
  // - platform param accepts an ID, or an object with platformId and version
  // - strings param accepts a string, an object, or an array of strings or objects
  methods.string.del = function(platform, strings, cb) {
    // Parse platform
    if (typeof platform === 'string' || typeof platform === 'number') platform = { 'platform-id': platform }
    else if (platform.platformId) {
      platform['platform-id'] = platform.platformId;
      delete platform['platformId'];
    }
    
    // Parse strings
    if (!_.isArray(strings)) strings = [strings];        
    strings = strings.map(function(string) {
      if (typeof string === 'string') string = { 'string-key': string };
      else if (string.stringKey) {
        string['string-key'] = string.stringKey;
        delete string.stringKey;
      }
      return string;
    });

    var data = _.extend(platform, {'to-delete': JSON.stringify(strings)});
    post('string/delete', data, cb);
  };

  // Upload phrase file
  methods.string.upload = function (platform, filepath, format, cb) {
    // Parse platform
    if (typeof platform === 'string' || typeof platform === 'number') platform = { 'platform-id': platform }
    else if (platform.platformId) {
      platform['platform-id'] = platform.platformId;
      delete platform['platformId'];
    }

    var data = _.extend(platform, {
      'file': fs.createReadStream(filepath),
      'format': format
    });
    upload('string/upload', data, cb);
  };

  ////
  ////  Translation Order API
  ////

  // Get translation quote
  methods.translate.quote = function(data, cb) {
    // Parse data
    data = removeUndefined({
      'platform-id': data.platformId || data['platform-id'],
      version: data.version,
      'from-locale': data.fromLocale || data['from-locale'],
      'to-locale': data.toLocale || data['to-locale'],
      filter: data.filter
    });

    post('translate/quote', data, cb);
  };

  // Place order
  methods.translate.order = function(data, cb) {
    data = removeUndefined({
      'platform-id': data.platformId || data['platform-id'],
      version: data.version,
      'agency-id': data.agencyId || data['agency-id'],         
      'from-locale': data.fromLocale || data['from-locale'],
      'to-locale': data.toLocale || data['to-locale'],
      filter: data.filter
    });

    post('translate/order', data, cb);    
  };


  ////
  ////   String Accessibility API
  ////

  // Grant string access to user
  // - Accepts an object or an array of objects for its data
  // TODO: Untested
  methods.stringAccess.input = function(platformId, data, cb) {
    if (!_.isArray(data)) data = [data];
    data = data.map(function(d) {
      var newD = {
        'platform-id': d.platformId || d['platform-id'],
        'user-id': d.userId || d['user-id'],
        'string-key': d.stringKey || d['string-key'],
      };
      if (d.timestamp) newD.timestamp = d.timestamp;
      return newD;
    });

    // Add platform ID
    _.extend(data, { 'platform-id': platformId });

    post('string-access/input', data, cb);
  };

  // List string keys a user has accessibility to
  // TODO: Untested
  methods.stringAccess.listRight = function(platformId, userId, cb) {
    var data = {
      'platform-id': platformId,
      'user-id': userId
    }
    get('string-access/list-right', data, cb);
  };

  // Delete accessibilities granted to user
  // TODO: Untested
  methods.stringAccess.deleteByUser = function(platformId, userId, cb) {
    var data = {
      'platform-id': platformId,
      'user-id': userId
    }
    post('string-access/delete-by-user', data, cb);
  };
  
  // Delete all accessibilities to a string
  // TODO: Untested
  methods.stringAccess.deleteByString = function(platformId, stringKey, cb) {
    var data = {
      'platform-id': platformId,
      'string-key': stringKey
    }
    post('string-access/delete-by-string', data, cb);
  };
  
  // Delete accessibilities from a user to a string
  // TODO: Untested
  methods.stringAccess.deleteRight = function(platformId, userId, stringKey, cb) {
    var data = {
      'platform-id': platformId,
      'user-id': userId,
      'string-key': stringKey
    }
    post('string-access/delete-right', data, cb);
  };


  ////
  ////  Platform Management API
  ////

  // Get platform info
  methods.platform.details = function(platformId, cb) {
    platformId = { 'platform-id': platformId };
    get('platform/details', platformId, cb);
  };

  // Add platform
  // - data param accepts a platform_type as a string, or an object 
  //   with additional onesky options
  // - description param is actually the name of the project. There's no
  //   way to add a description when creating
  // - stringPublishThreashold, stringConfirmThreshold and accessibleBy
  //   are not set when adding platform. Bug in onesky api
  methods.platform.add = function(projectId, data, cb) {
    // Parse data
    if (typeof data === 'string') data = { type: data }
    else {
      data = _.extend({
        'string-publish-threshold': data.stringPublishThreshold || data['string-publish-threshold'],
        'string-confirm-threshold': data.stringConfirmThreshold || data['string-confirm-threshold'], 
        'accessible-by': data.accessibleBy || data['accessible-by'],
      }, _.pick(data, 'type', 'description'));
      data = removeUndefined(data);
    }

    // Add project id
    _.extend(data, {project: projectId});

    post('platform/add', data, cb);
  };

  // Modify platform
  // - data param accepts an object
  // - description param is actually the name of the project
  methods.platform.modify = function(platformId, data, cb) {
    // Parse data
    if (typeof data === 'string') data = { type: data }
    else {
      data = _.extend({
        'string-publish-threshold': data.stringPublishThreshold || data['string-publish-threshold'],
        'string-confirm-threshold': data.stringConfirmThreshold || data['string-confirm-threshold'], 
        'accessible-by': data.accessibleBy || data['accessible-by'],
      }, _.pick(data, 'type', 'description'));
      data = removeUndefined(data);
    }

    // Add platform id
    _.extend(data, {'platform-id': platformId});

    post('platform/modify', data, cb);
  };

  
  // Get activated locales for a platform
  methods.platform.locales = function(platformId, cb) {
    platformId = { 'platform-id': platformId };
    post('platform/locales', platformId, cb);
  };

  // Delete platform
  methods.platform.del = function(platformId, cb) {
    platformId = { 'platform-id': platformId };
    post('platform/delete', platformId, cb);
  };

  // Imporase phrases and translations into a platform from another
  // - Warning: sometimes imports deleted strings
  methods.platform.imp = function(data, cb) {
    data = _.extend({
      'platform-id': data.platformId || data['platform-id'],
      'from-platform-id': data.fromPlatformId || data['from-platform-id'],
    }, _.pick(data, 'locales'));

    // Convert locales to string
    if (data.locales && _.isArray(data.locales)) data.locales = data.locales.join(',');

    post('platform/import', data, cb);
  };




  ////
  ////  Translator API
  ////

  // Get contribution data of a contributer
  // - Locale is optional
  methods.translator.contribution = function(platformId, email, locale, cb) {
    if (!cb) {
      cb = locale;
      locale = null;
    }
    var data = {
      'platform-id': platformId,
      email: email
    }
    if (locale) data.locale = locale;

    get('translator/contribution', data, cb);
  };


  ////
  ////  Utility API
  ////

  // Get onesky locales
  methods.locales = function(cb) {
    get('locales', {}, cb);
  };

  // Get onesky platforms
  methods.platformTypes = function(cb) {
    get('platform-types', {}, cb);
  };

  // Get SSO
  methods.sso.getLink = function(uniqueId, name, cb) {
    var data = {
      'unique-id': uniqueId,
      'name': name
    }
    post('sso/get-link', data, cb);
  };


  

  return {
    //  Project Management API
    projects: methods.projects,
    project: {
      platforms:    methods.project.platforms,
      add:          methods.project.add,
      details:      methods.project.details,
      modify:       methods.project.modify,
      del:          methods.project.del
    },
    
    //  Translation I/O API
    string: {
      input:        methods.string.input,
      translate:    methods.string.translate,
      output:       methods.string.output,
      del:          methods.string.del,
      upload:       methods.string.upload,
      download:     undefined
    },
    
    //  Translation Order API
    translate: {
      quote:        methods.translate.quote,
      order:        methods.translate.order
    },

    // String Accessibility API
    stringAccess: {
      input:        methods.stringAccess.input,
      listRight:    methods.stringAccess.listRight,
      delByUser:    methods.stringAccess.deleteByUser,
      delByString:  methods.stringAccess.deleteByString,
      delRight:     methods.stringAccess.deleteRight
    },
    
    //  Platform Management API
    platform: {
      details:      methods.platform.details,
      add:          methods.platform.add,
      modify:       methods.platform.modify,
      locales:      methods.platform.locales,
      del:          methods.platform.del,
      imp:          methods.platform.imp
    },
    
    //  Translator API
    translator: {
      contribution: methods.translator.contribution
    },

    //  Utility API
    locales:        methods.locales,
    platformTypes:  methods.platformTypes,
    sso: {
      getLink:      methods.sso.getLink
    }
    

  }
};
