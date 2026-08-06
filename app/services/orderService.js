(function() {
    'use strict';
    angular.module('app').factory('orderService', Service);
    Service.$inject = ['$http', 'globalConfig'];

    function Service($http, globalConfig) {
        var base = globalConfig.apiAddress + '/order';
        return {
            getOrders: function(params) { return $http.get(base, { params: params || {} }); },
            getOrder: function(id) { return $http.get(base + '/' + id); },
            createOrder: function(data) { return $http.post(base, data); },
            updateStatus: function(id, status, notes) { return $http.patch(base + '/' + id + '/status', { status: status, notes: notes }); },
            cancelOrder: function(id) { return $http.delete(base + '/' + id); }
        };
    }
})();
