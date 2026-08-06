(function() {
    'use strict';
    angular.module('app').controller('dashboardController', Controller);
    Controller.$inject = ['$scope', '$rootScope', 'dashboardService', 'notificationService', 'authService'];

    function Controller($scope, $rootScope, dashboardService, notificationService, authService) {
        $rootScope.Title = 'Dashboard';
        $scope.stats = {};
        $scope.recentOrders = [];
        $scope.latestActivity = [];
        $scope.loading = true;
        $scope.currentUser = authService.getUser();

        function loadStats() {
            dashboardService.getStats().then(function(res) {
                if (res.data.success) {
                    $scope.stats = res.data.data;
                    $scope.recentOrders = res.data.data.recentOrders || [];
                    $scope.latestActivity = res.data.data.latestActivity || [];
                    $scope.recentPrescriptions = res.data.data.recentPrescriptions || [];
                    $rootScope.unreadNotifications = res.data.data.unreadNotifications || 0;
                }
                $scope.loading = false;
            }).catch(function() {
                $scope.loading = false;
            });
        }

        loadStats();

        $scope.refresh = function() {
            $scope.loading = true;
            loadStats();
        };
    }
})();
