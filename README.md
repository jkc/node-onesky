OneSky API for Node
===========

This module provides full access to the [OneSky API](http://developer.oneskyapp.com/api).

Onesky is a service for managing translations of websites and mobile apps. 

**Warning**: This module is in *alpha*. Future versions are likely to include breaking changes.

Installation
----------

Install via [npm](http://npmjs.org/)

    npm install onesky --save

Example usage
----------

Require onesky with your private and public keys:

    var privateKey = 'abc', // Secret onesky key
        publicKey = '123';  // Public onesky key

    var onesky = require('onesky')(privateKey, publicKey);
    
