/*global UAParser*/
;(function () {
    'use strict';
    var app = angular.module('ErrorLogger', []);

    app.factory('Logs', ['$http', '$q', function ($http, $q) {
        var url = '',
            cache = {};

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

        return {
            /**
             * Retrieve logs corresponding to server and type
             * @param  {String} server Server: production or staging
             * @param  {String} type   Type: latest or ranked
             * @return {Deferred}      Http deferred
             */
            get: function (server, type) {
                var data = cache[server + '_' + type],
                    deferred = $q.defer();

                if (data) {
                    deferred.resolve(cache);
                } else {
                    $http
                        .jsonp(url)
                        .success(function (data) {
                            data = processDataTop(data);
                            cache[server + '_' + type] = data;
                            deferred.resolve(data);
                        });
                }


                return deferred.promise;
            }
        };
    }]);

    app.controller('ErrorCtrl', ['$scope', 'Logs', function ($scope, Logs) {
        $scope.loading = true;

        Logs.get('production', 'top')
            .then(function (data) {
                $scope.loading = false;
                $scope.logs = data;
            });
    }]);
}());
