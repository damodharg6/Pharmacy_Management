(function() {
    'use strict';

    angular.module('app', ['ui.router'])
        .constant('globalConfig', {
            apiAddress: 'http://localhost:3000/api'
        })
        .config(function($stateProvider, $urlRouterProvider, $httpProvider) {
            // HTTP Interceptor
            $httpProvider.interceptors.push('httpInterceptor');

            $urlRouterProvider.otherwise('/');

            $stateProvider

            // Default home (empty)
            .state('home', {
                url: '/',
                template: '<div></div>'
            })

            // Dashboard
            .state('dashboard', {
                url: '/dashboard',
                templateUrl: '/views/dashboard/index.html',
                controller: 'dashboardController'
            })

            // ---- USERS ----
            .state('users', {
                url: '/users',
                templateUrl: '/views/user/index.html',
                controller: 'userController'
            })
            .state('add_user', {
                url: '/adduser',
                templateUrl: '/views/user/add_user.html',
                controller: 'userController'
            })
            .state('edit', {
                url: '/edit/:id',
                templateUrl: '/views/user/create.html',
                controller: 'userController'
            })
            .state('details', {
                url: '/details/:id',
                templateUrl: '/views/user/details.html',
                controller: 'userController'
            })

            // ---- MEDICINES ----
            .state('medicines', {
                url: '/medicines',
                templateUrl: '/views/medicine/index.html',
                controller: 'medicineController'
            })
            .state('createMedicine', {
                url: '/medicines/create',
                templateUrl: '/views/medicine/create.html',
                controller: 'medicineController'
            })
            .state('editMedicine', {
                url: '/medicines/edit/:id',
                templateUrl: '/views/medicine/create.html',
                controller: 'medicineController'
            })
            .state('lowStock', {
                url: '/medicines/low-stock',
                templateUrl: '/views/medicine/index.html',
                controller: 'medicineController'
            })
            .state('categories', {
                url: '/categories',
                templateUrl: '/views/medicine/categories.html',
                controller: 'medicineController'
            })

            // ---- ORDERS ----
            .state('orders', {
                url: '/orders',
                templateUrl: '/views/order/index.html',
                controller: 'orderController'
            })
            .state('createOrder', {
                url: '/orders/create',
                templateUrl: '/views/order/create.html',
                controller: 'orderController'
            })
            .state('orderDetail', {
                url: '/orders/:id',
                templateUrl: '/views/order/detail.html',
                controller: 'orderController'
            })

            // ---- PRESCRIPTIONS ----
            .state('prescriptions', {
                url: '/prescription',
                templateUrl: '/views/prescription/index.html',
                controller: 'prescriptionController'
            })
            .state('createPrescription', {
                url: '/prescription/createPrescription',
                templateUrl: '/views/prescription/createPrescription.html',
                controller: 'prescriptionController'
            })
            .state('editPrescription', {
                url: '/prescription/editPrescription/:id',
                templateUrl: '/views/prescription/createPrescription.html',
                controller: 'prescriptionController'
            })

            // ---- SUPPLIERS ----
            .state('suppliers', {
                url: '/supplierTable',
                templateUrl: '/views/drugAS/supplierTable.html',
                controller: 'supplierController'
            })
            .state('addSupplier', {
                url: '/addSupplier',
                templateUrl: '/views/drugAS/addSupplier.html',
                controller: 'supplierController'
            })
            .state('editSupplier', {
                url: '/editSupplier/:id',
                templateUrl: '/views/drugAS/addSupplier.html',
                controller: 'supplierController'
            })

            // ---- ORDER MANAGEMENT (legacy) ----
            .state('drugs', {
                url: '/drugtable',
                templateUrl: '/views/drugAS/druglist.html',
                controller: 'drugControllerAS'
            })
            .state('addrequests', {
                url: '/addrequests',
                templateUrl: '/views/drugAS/sendReq.html',
                controller: 'requestController'
            })
            .state('requests', {
                url: '/requests',
                templateUrl: '/views/drugAS/viewRequest.html',
                controller: 'requestController'
            })
            .state('emails', {
                url: '/mailtable',
                templateUrl: '/views/drugAS/order.html',
                controller: 'emailController'
            })
            .state('sendMail', {
                url: '/sendMail',
                templateUrl: '/views/drugAS/placeOrder.html',
                controller: 'emailController'
            })
            .state('editMail', {
                url: '/editMail/:id',
                templateUrl: '/views/drugAS/placeOrder.html',
                controller: 'emailController'
            })
            .state('editRequests', {
                url: '/editRequests/:id',
                templateUrl: '/views/drugAS/sendReq.html',
                controller: 'requestController'
            })
            .state('addDrug', {
                url: '/addDrug',
                templateUrl: '/views/Drug/add.html',
                controller: 'drugController'
            })

            // ---- REPORTS ----
            .state('reports', {
                url: '/reports',
                templateUrl: '/views/reports/index.html',
                controller: 'reportController'
            })

            // ---- AUDIT LOGS ----
            .state('auditLogs', {
                url: '/audit-logs',
                templateUrl: '/views/audit/index.html',
                controller: 'auditController'
            });
        })
        .run(function($rootScope, $window, authService) {
            $rootScope.currentUser = authService.getUser();
            $rootScope.logout = function() {
                authService.logout();
            };

            // Define state permission lists
            var adminOnlyStates = ['users', 'add_user', 'edit', 'details', 'auditLogs'];
            var adminAndPharmacistStates = [
                'createMedicine', 'editMedicine', 'lowStock', 'categories',
                'orders', 'createOrder', 'orderDetail',
                'suppliers', 'addSupplier', 'editSupplier',
                'drugs', 'addrequests', 'requests', 'emails', 'sendMail', 'editMail', 'editRequests', 'addDrug', 'reports'
            ];

            // Session & role check on state transition or route change
            $rootScope.$on('$stateChangeStart', function(event, toState) {
                if (!authService.isLoggedIn() && $window.location.pathname !== '/login.html' && $window.location.pathname !== '/') {
                    // Redirect to login if unauthenticated
                    $window.location.href = '/login';
                    return;
                }

                var role = authService.getUserRole();
                if (role === 'doctor') {
                    if (adminOnlyStates.indexOf(toState.name) !== -1 || adminAndPharmacistStates.indexOf(toState.name) !== -1) {
                        event.preventDefault();
                        $window.location.href = '/doctor/dashboard';
                    }
                } else if (role === 'pharmacist') {
                    if (adminOnlyStates.indexOf(toState.name) !== -1) {
                        event.preventDefault();
                        $window.location.href = '/pharmacist/dashboard';
                    }
                }
            });
        });
})();