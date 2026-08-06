(function() {
    'use strict';

    angular.module('app')
        .factory('authService', authService)
        .factory('httpInterceptor', httpInterceptor)
        .config(configInterceptor);

    authService.$inject = ['$http', '$window', '$state', 'globalConfig'];
    httpInterceptor.$inject = ['$q', '$window', '$injector'];
    configInterceptor.$inject = ['$httpProvider'];

    function authService($http, $window, $state, globalConfig) {
        var TOKEN_KEY = 'pharma_token';
        var USER_KEY = 'pharma_user';

        return {
            login: function(email, password) {
                return $http.post(globalConfig.apiAddress + '/auth/login', { email: email, password: password })
                    .then(function(res) {
                        if (res.data.success) {
                            $window.localStorage.setItem(TOKEN_KEY, res.data.token);
                            $window.localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
                        }
                        return res;
                    });
            },
            logout: function() {
                var token = $window.localStorage.getItem(TOKEN_KEY);
                return $http.post(globalConfig.apiAddress + '/auth/logout', {}, {
                    headers: { 'Authorization': 'Bearer ' + token }
                }).finally(function() {
                    $window.localStorage.removeItem(TOKEN_KEY);
                    $window.localStorage.removeItem(USER_KEY);
                    $window.location.href = '/';
                });
            },
            getToken: function() {
                return $window.localStorage.getItem(TOKEN_KEY);
            },
            getUser: function() {
                var u = $window.localStorage.getItem(USER_KEY);
                return u ? JSON.parse(u) : null;
            },
            isLoggedIn: function() {
                return !!$window.localStorage.getItem(TOKEN_KEY);
            },
            getUserRole: function() {
                var user = this.getUser();
                return user && user.role ? user.role.toLowerCase() : '';
            },
            isAdmin: function() {
                return this.getUserRole() === 'admin';
            },
            isDoctor: function() {
                return this.getUserRole() === 'doctor';
            },
            isPharmacist: function() {
                return this.getUserRole() === 'pharmacist';
            },
            getRedirectUrl: function(role) {
                var r = (role || this.getUserRole()).toLowerCase();
                if (r === 'admin') return '/admin/dashboard';
                if (r === 'doctor') return '/doctor/dashboard';
                if (r === 'pharmacist') return '/pharmacist/dashboard';
                return '/dashboard';
            }
        };
    }

    function httpInterceptor($q, $window, $injector) {
        return {
            request: function(config) {
                var token = $window.localStorage.getItem('pharma_token');
                if (token) {
                    config.headers['Authorization'] = 'Bearer ' + token;
                }
                return config;
            },
            responseError: function(rejection) {
                if (rejection.status === 401) {
                    $window.localStorage.removeItem('pharma_token');
                    $window.localStorage.removeItem('pharma_user');
                    if ($window.location.pathname !== '/login.html' && $window.location.pathname !== '/login' && $window.location.pathname !== '/') {
                        $window.location.href = '/login?expired=true';
                    }
                }
                return $q.reject(rejection);
            }
        };
    }

    function configInterceptor($httpProvider) {
        $httpProvider.interceptors.push('httpInterceptor');
    }
})();
