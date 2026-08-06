(function() {
    'use strict';
    angular.module('app').controller('userController', Controller);
    Controller.$inject = ['$scope', '$rootScope', '$state', '$stateParams', 'userService'];

    function Controller($scope, $rootScope, $state, $stateParams, userService) {
        $scope.users = [];
        $scope.user = {};
        $scope.loading = false;
        $scope.search = '';
        $scope.filterRole = '';
        $scope.page = 1;
        $scope.totalPages = 1;
        $scope.toast = { show: false, message: '', type: 'success' };
        $scope.roleOptions = ['admin', 'doctor', 'pharmacist', 'chief_pharmacist'];

        function showToast(msg, type) {
            $scope.toast = { show: true, message: msg, type: type || 'success' };
            setTimeout(function() { $scope.$apply(function() { $scope.toast.show = false; }); }, 3000);
        }

        if ($state.current.name === 'users') {
            $rootScope.Title = 'User Management';

            $scope.loadUsers = function() {
                $scope.loading = true;
                var params = { page: $scope.page, limit: 20 };
                if ($scope.search) params.search = $scope.search;
                if ($scope.filterRole) params.role = $scope.filterRole;

                userService.getUsers(params).then(function(res) {
                    if (res.data.success) {
                        $scope.users = res.data.data;
                        $scope.totalPages = res.data.pages;
                        $scope.total = res.data.total;
                    }
                    $scope.loading = false;
                }).catch(function() { $scope.loading = false; });
            };
            $scope.loadUsers();

            $scope.deleteUser = function(id, name) {
                if (!confirm('Delete ' + name + '? This cannot be undone.')) return;
                userService.deleteUser(id).then(function(res) {
                    if (res.data.success) {
                        showToast(name + ' deleted.');
                        $scope.loadUsers();
                    } else {
                        showToast(res.data.message, 'error');
                    }
                });
            };

            $scope.toggleActive = function(user) {
                var action = user.isActive ? 'deactivate' : 'activate';
                userService.setActiveStatus(user._id, action).then(function(res) {
                    if (res.data.success) {
                        user.isActive = !user.isActive;
                        showToast(user.name + ' ' + action + 'd.');
                    } else {
                        showToast(res.data.message, 'error');
                    }
                });
            };

            $scope.nextPage = function() { if ($scope.page < $scope.totalPages) { $scope.page++; $scope.loadUsers(); } };
            $scope.prevPage = function() { if ($scope.page > 1) { $scope.page--; $scope.loadUsers(); } };
        }

        else if ($state.current.name === 'add_user') {
            $rootScope.Title = 'Add New User';
            $scope.user = { isActive: true };

            $scope.saveData = function(user) {
                $scope.IsSubmit = true;
                if ($scope.userForm.$invalid) { showToast('Please fix the form errors.', 'error'); return; }
                if (user.password !== user.password2) { showToast('Passwords do not match.', 'error'); return; }

                userService.add_user(user).then(function(res) {
                    if (res.data.success) {
                        showToast('User created successfully!');
                        $state.go('users');
                    } else {
                        showToast(res.data.message, 'error');
                    }
                }).catch(function(err) {
                    showToast(err.data ? err.data.message : 'Error creating user.', 'error');
                });
            };
        }

        else if ($state.current.name === 'edit') {
            $rootScope.Title = 'Edit User';
            var id = $stateParams.id;

            userService.getUser(id).then(function(res) {
                if (res.data.success) $scope.user = res.data.data;
            });

            $scope.saveData = function(user) {
                $scope.IsSubmit = true;
                if (user.password && user.password !== user.password2) {
                    showToast('Passwords do not match.', 'error');
                    return;
                }
                userService.updateUser(user).then(function(res) {
                    if (res.data.success) {
                        showToast('User updated!');
                        $state.go('users');
                    } else {
                        showToast(res.data.message, 'error');
                    }
                }).catch(function(err) {
                    showToast(err.data ? err.data.message : 'Error updating user.', 'error');
                });
            };
        }
    }
})();