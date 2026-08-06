(function() {
    'use strict';
    angular.module('app').factory('userService', Service);
    Service.$inject = ['$http', 'globalConfig'];

    function Service($http, globalConfig) {
        var base = globalConfig.apiAddress + '/user';
        return {
            getUsers: function(params) { return $http.get(base, { params: params || {} }); },
            getUser: function(id) { return $http.get(base + '/' + id); },
            add_user: function(user) { return $http.post(base, user); },
            updateUser: function(user) { return $http.put(base + '/' + user._id, user); },
            deleteUser: function(id) { return $http.delete(base + '/' + id); },
            setActiveStatus: function(id, action) { return $http.patch(base + '/' + id + '/' + action, {}); }
        };
    }
})();