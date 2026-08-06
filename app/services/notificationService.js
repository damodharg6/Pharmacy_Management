(function() {
    'use strict';
    angular.module('app').factory('notificationService', Service);
    Service.$inject = ['$http', 'globalConfig'];

    function Service($http, globalConfig) {
        var base = globalConfig.apiAddress + '/notification';
        return {
            getNotifications: function(params) { return $http.get(base, { params: params || {} }); },
            markRead: function(id) { return $http.patch(base + '/' + id + '/read', {}); },
            markAllRead: function() { return $http.patch(base + '/mark-all-read', {}); },
            deleteNotification: function(id) { return $http.delete(base + '/' + id); }
        };
    }
})();
