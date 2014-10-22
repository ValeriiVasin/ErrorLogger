/*global UAParser*/
;(function () {
  'use strict';
  var app = angular.module('ErrorLogger', []);

  app.config(['$routeProvider', function (router) {
    router
      .when('/production/top', {
        server: 'production',
        type: 'top',
        templateUrl: 'views/top.html'
      })
      .when('/production/latest', {
        server: 'production',
        type: 'latest',
        templateUrl: 'views/latest.html'
      })
      .when('/staging/top', {
        server: 'staging',
        type: 'top',
        templateUrl: 'views/top.html'
      })
      .when('/staging/latest', {
        server: 'staging',
        type: 'latest',
        templateUrl: 'views/latest.html'
      })
      .otherwise({
        redirectTo: '/production/latest'
      });
  }]);

  app.factory('Logs', ['$http', '$q', function ($http, $q) {
    var _url = 'http://njs.services.livejournal.com/status/{server}?secret={secret}&callback=JSON_CALLBACK',
      cache = {},
      _secret = '';

    function processDataTop(data) {
      var ua = new UAParser();
      return data
        .slice(0, 200)
        .map(function (data) {
          data.errors = data.errors
            .slice(0, 10)
            .map(function (error) {
              var qs = error.qs,
                _ua;

              ua.setUA(error.ua);
              _ua = ua.getResult();

              return {
                user: qs.user || '<anonymous>',
                where: qs.where,
                browser: _ua.browser.name + ' ' + _ua.browser.version,
                os: _ua.os.name,
                timestamp: new Date(error.timestamp)
              };
            });

          return data;
        });
    }

    function processDataLatest(data) {
      var ua = new UAParser();

      data = data.map(function (error) {
        var qs = error.qs,
          _ua;

        ua.setUA(error.ua);
        _ua = ua.getResult();

        return {
          msg: qs.msg,

          user: qs.user || '<anonymous>',
          where: qs.where,
          browser: _ua.browser.name + ' ' + _ua.browser.version,
          os: _ua.os.name,

          timestamp: new Date(error.timestamp),
          ljstaging: error.ljstaging
        };
      });

      return data;
    }

    return {
      /**
       * Retrieve logs corresponding to server and type
       * @param  {String} server Server: production or staging
       * @param  {String} type   Type: latest or ranked
       * @return {Deferred}    Http deferred
       */
      getLogs: function (server, type) {
        var data = cache[server + '_' + type],
          deferred = $q.defer(),
          url;

        if ( !this.hasSecret() ) {
          throw new Error('You should provide secret key.');
        }

        console.info('Get logs: %s %s', server, type);

        if (data) {
          deferred.resolve(data);
        } else {
          url = _url
            .replace('{server}', server === 'production' ? 'js_prod' : 'js_dev')
            .replace('{secret}', _secret);

          if (type === 'top') {
            url += '&use=memory';
          }

          $http
            .jsonp(url)
            .success(function (data) {
              data = type === 'top' ?
                processDataTop(data) :
                processDataLatest(data);

              cache[server + '_' + type] = data;
              deferred.resolve(data);
            });
        }

        return deferred.promise;
      },

      /**
       * Save secret key for later usage
       */
      setSecret: function (secret) {
        _secret = secret;
        return this;
      },

      /**
       * Has secret been initialized or not
       * @return {Boolean}  Result
       */
      hasSecret: function () {
        return Boolean(_secret);
      }
    };
  }]);

  app.controller('ErrorCtrl', [
    '$scope', '$route', 'Logs',
    function ($scope, $route, Logs) {
      $scope.secretInput = '';
      $scope.secret = localStorage.getItem('secret');
      $scope.server = '';
      $scope.type = '';

      $scope.$on('$routeChangeSuccess', function () {
        var server = $route.current.server,
          type = $route.current.type,
          changed = false;

        if (!server || !type || !$scope.secret) {
          return;
        }

        if (server !== $scope.server) {
          $scope.server = server;
          changed = true;
        }

        if (type !== $scope.type) {
          $scope.type = type;
          changed = true;
        }

        if (changed) {
          showLogs();
        }
      });

      function showLogs() {
        $scope.loading = true;
        Logs.getLogs($scope.server, $scope.type)
          .then(function (data) {
            $scope.loading = false;
            $scope.logs = data;
          });
      }

      if ($scope.secret) {
        Logs.setSecret($scope.secret);
      }

      $scope.setSecret = function () {
        var secret = $scope.secretInput;
        $scope.secret = secret;
        localStorage.setItem('secret', secret);
        Logs.setSecret(secret);
        showLogs();
      };
    }
  ]);
}());
