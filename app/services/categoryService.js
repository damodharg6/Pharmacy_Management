(function() {
    'use strict';
    angular.module('app').factory('categoryService', Service);
    Service.$inject = ['$http', 'globalConfig'];

    function Service($http, globalConfig) {
        var base = globalConfig.apiAddress + '/category';
        return {
            getCategories: function() { return $http.get(base); },
            createCategory: function(data) { return $http.post(base, data); },
            updateCategory: function(id, data) { return $http.put(base + '/' + id, data); },
            deleteCategory: function(id) { return $http.delete(base + '/' + id); }
        };
    }
})();
