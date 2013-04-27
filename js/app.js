/*global UAParser*/
;(function () {
    'use strict';
    var app = angular.module('ErrorLogger', []);

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
            return data;
        }

        return {
            /**
             * Retrieve logs corresponding to server and type
             * @param  {String} server Server: production or staging
             * @param  {String} type   Type: latest or ranked
             * @return {Deferred}      Http deferred
             */
            getLogs: function (server, type) {
                var data = cache[server + '_' + type],
                    deferred = $q.defer(),
                    url;

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
            }
        };
    }]);

    app.controller('ErrorCtrl', ['$scope', 'Logs', function ($scope, Logs) {
        $scope.secret = localStorage.getItem('secret');
        $scope.server = 'production';
        $scope.type = 'top';

        function init(secret) {
            Logs.setSecret(secret);
            showLogs();
        }

        function showLogs() {
            $scope.loading = true;
            Logs.getLogs($scope.server, $scope.type)
                .then(function (data) {
                    $scope.loading = false;
                    $scope.logs = data;
                });
        }

        if ($scope.secret) {
            init($scope.secret);
        }

        $scope.setSecret = function () {
            var secret = $scope.secretInput;
            $scope.secret = secret;
            localStorage.setItem('secret', secret);
            init(secret);
        };

        $scope.setServer = function (server) {
            if ( $scope.server !== server ) {
                $scope.server = server;
                showLogs();
            }
        };
    }]);
}());
