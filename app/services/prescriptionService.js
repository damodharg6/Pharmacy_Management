(function() {
    'use strict';
    angular.module('app').factory('prescriptionService', Service);
    Service.$inject = ['$http', 'globalConfig'];

    function Service($http, globalConfig) {
        var base = globalConfig.apiAddress + '/prescription';
        return {
            getPrescriptions: function(params) { return $http.get(base, { params: params || {} }); },
            getPrescription: function(id) { return $http.get(base + '/' + id); },
            createPrescription: function(data) { return $http.post(base, data); },
            updatePrescription: function(data) { return $http.put(base + '/' + data._id, data); },
            deletePrescription: function(id) { return $http.delete(base + '/' + id); },
            dispensePrescription: function(id) { return $http.patch(base + '/' + id + '/dispense', {}); }
        };
    }
})();