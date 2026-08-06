(function() {
    'use strict';
    angular.module('app').factory('dashboardService', Service);
    Service.$inject = ['$http', 'globalConfig'];

    function Service($http, globalConfig) {
        var base = globalConfig.apiAddress + '/dashboard';
        return {
            getStats: function() { return $http.get(base + '/stats'); },
            getChartData: function() { return $http.get(base + '/chart'); }
        };
    }
})();
