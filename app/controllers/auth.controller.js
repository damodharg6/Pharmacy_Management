(function() {
    'use strict';
    angular.module('app').controller('authController', Controller);
    Controller.$inject = ['$scope', '$window', 'authService'];

    function Controller($scope, $window, authService) {
        $scope.credentials = {};
        $scope.loading = false;
        $scope.error = '';

        // Display session expired message if redirected with expired=true
        if ($window.location.search && $window.location.search.indexOf('expired=true') !== -1) {
            $scope.error = 'Session expired, please log in again.';
        }

        // Redirect if already logged in
        if (authService.isLoggedIn()) {
            var user = authService.getUser();
            if (user && user.role) {
                $window.location.href = authService.getRedirectUrl(user.role);
                return;
            }
        }

        $scope.login = function() {
            if (!$scope.credentials.email || !$scope.credentials.password) {
                $scope.error = 'Please enter email and password.';
                return;
            }
            $scope.loading = true;
            $scope.error = '';

            authService.login($scope.credentials.email, $scope.credentials.password)
                .then(function(res) {
                    if (res.data.success) {
                        var user = res.data.user;
                        $window.location.href = authService.getRedirectUrl(user.role);
                    } else {
                        $scope.error = res.data.message || 'Login failed.';
                    }
                })
                .catch(function(err) {
                    $scope.error = (err.data && err.data.message) ? err.data.message : 'Invalid email or password.';
                })
                .finally(function() {
                    $scope.loading = false;
                });
        };
    }
})();
