/*global UAParser*/
;(function () {
    'use strict';
    var app = angular.module('ErrorLogger', []);

    app.controller('ErrorCtrl', ['$scope', function ($scope) {
        // map data
        var ua = new UAParser();
        window.data = window.data.slice(0, 200).map(function (data) {
            data.errors = data.errors.slice(0, 10).map(function (error) {
                var qs = error.qs,
                    _ua;

                ua.setUA(error.ua);
                _ua = ua.getResult();

                return {
                    user: qs.user || '<anonymous>',
                    where: qs.where,
                    browser: _ua.browser.name + ' ' + _ua.browser.version,
                    os: _ua.os.name
                };
            });

            return data;
        });

        $scope.logs = window.data;
    }]);
}());
