(function() {
    'use strict';
    angular.module('app').factory('medicineService', Service);
    Service.$inject = ['$http', 'globalConfig'];

    function Service($http, globalConfig) {
        var base = globalConfig.apiAddress + '/medicine';
        return {
            getMedicines: function(params) { return $http.get(base, { params: params || {} }); },
            getMedicine: function(id) { return $http.get(base + '/' + id); },
            getLowStock: function() { return $http.get(base + '/low-stock'); },
            createMedicine: function(data) { return $http.post(base, data); },
            updateMedicine: function(id, data) { return $http.put(base + '/' + id, data); },
            deleteMedicine: function(id) { return $http.delete(base + '/' + id); },
            adjustStock: function(id, data) { return $http.patch(base + '/' + id + '/stock', data); }
        };
    }
})();
