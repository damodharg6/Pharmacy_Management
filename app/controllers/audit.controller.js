(function() {
    'use strict';
    angular.module('app').controller('auditController', Controller);
    Controller.$inject = ['$scope', '$rootScope', '$http', 'globalConfig'];

    function Controller($scope, $rootScope, $http, globalConfig) {
        $rootScope.Title = 'Audit Logs';
        $scope.logs = [];
        $scope.loading = false;
        $scope.page = 1;
        $scope.totalPages = 1;
        $scope.filterModule = '';

        $scope.loadLogs = function() {
            $scope.loading = true;
            var params = { page: $scope.page, limit: 30 };
            if ($scope.filterModule) params.module = $scope.filterModule;

            $http.get(globalConfig.apiAddress + '/audit', { params: params }).then(function(res) {
                if (res.data.success) {
                    $scope.logs = res.data.data;
                    $scope.totalPages = res.data.pages;
                }
                $scope.loading = false;
            }).catch(function() { $scope.loading = false; });
        };

        $scope.loadLogs();

        $scope.nextPage = function() { if ($scope.page < $scope.totalPages) { $scope.page++; $scope.loadLogs(); } };
        $scope.prevPage = function() { if ($scope.page > 1) { $scope.page--; $scope.loadLogs(); } };
    }
})();
