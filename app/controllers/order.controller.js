(function() {
    'use strict';
    angular.module('app').controller('orderController', Controller);
    Controller.$inject = ['$scope', '$rootScope', '$state', '$stateParams', 'orderService', 'medicineService'];

    function Controller($scope, $rootScope, $state, $stateParams, orderService, medicineService) {
        $scope.orders = [];
        $scope.order = { customer: {}, items: [], discount: 0, tax: 0 };
        $scope.loading = false;
        $scope.filterStatus = '';
        $scope.search = '';
        $scope.page = 1;
        $scope.totalPages = 1;
        $scope.availableMedicines = [];
        $scope.toast = { show: false, message: '', type: 'success' };
        var statuses = ['pending', 'processing', 'packed', 'dispatched', 'delivered', 'cancelled'];
        $scope.statusOptions = statuses;

        function showToast(msg, type) {
            $scope.toast = { show: true, message: msg, type: type || 'success' };
            setTimeout(function() { $scope.$apply(function() { $scope.toast.show = false; }); }, 3000);
        }

        if ($state.current.name === 'orders') {
            $rootScope.Title = 'Orders';

            $scope.loadOrders = function() {
                $scope.loading = true;
                var params = { page: $scope.page, limit: 20 };
                if ($scope.filterStatus) params.status = $scope.filterStatus;
                if ($scope.search) params.search = $scope.search;

                orderService.getOrders(params).then(function(res) {
                    if (res.data.success) {
                        $scope.orders = res.data.data;
                        $scope.totalPages = res.data.pages;
                        $scope.total = res.data.total;
                    }
                    $scope.loading = false;
                }).catch(function() { $scope.loading = false; });
            };
            $scope.loadOrders();

            $scope.updateStatus = function(order, newStatus) {
                orderService.updateStatus(order._id, newStatus).then(function(res) {
                    if (res.data.success) {
                        order.status = newStatus;
                        showToast('Order ' + order.orderNo + ' updated to ' + newStatus);
                    } else {
                        showToast(res.data.message, 'error');
                    }
                });
            };

            $scope.cancelOrder = function(order) {
                if (!confirm('Cancel order ' + order.orderNo + '? Stock will be restored.')) return;
                orderService.cancelOrder(order._id).then(function(res) {
                    if (res.data.success) {
                        showToast('Order cancelled. Stock restored.');
                        $scope.loadOrders();
                    } else {
                        showToast(res.data.message, 'error');
                    }
                });
            };

            $scope.nextPage = function() { if ($scope.page < $scope.totalPages) { $scope.page++; $scope.loadOrders(); } };
            $scope.prevPage = function() { if ($scope.page > 1) { $scope.page--; $scope.loadOrders(); } };
        }

        else if ($state.current.name === 'createOrder') {
            $rootScope.Title = 'Create Order';

            medicineService.getMedicines({ limit: 1000 }).then(function(res) {
                if (res.data.success) $scope.availableMedicines = res.data.data;
            });

            $scope.addItem = function() {
                $scope.order.items.push({ medicine: '', quantity: 1, unitPrice: 0, total: 0 });
            };

            $scope.removeItem = function(idx) {
                $scope.order.items.splice(idx, 1);
                $scope.calculateTotal();
            };

            $scope.onMedicineSelect = function(item) {
                var med = $scope.availableMedicines.find(function(m) { return m._id === item.medicine; });
                if (med) {
                    item.unitPrice = med.price;
                    item.medicineName = med.name;
                    item.maxQty = med.quantity;
                    $scope.calculateItemTotal(item);
                }
            };

            $scope.calculateItemTotal = function(item) {
                item.total = (item.unitPrice || 0) * (item.quantity || 0);
                $scope.calculateTotal();
            };

            $scope.calculateTotal = function() {
                var sub = $scope.order.items.reduce(function(s, i) { return s + (i.total || 0); }, 0);
                $scope.order.subtotal = sub;
                $scope.order.total = sub - ($scope.order.discount || 0) + ($scope.order.tax || 0);
            };

            $scope.placeOrder = function() {
                if (!$scope.order.customer.name) { showToast('Customer name is required.', 'error'); return; }
                if (!$scope.order.items.length) { showToast('Add at least one item.', 'error'); return; }
                for (var i = 0; i < $scope.order.items.length; i++) {
                    if (!$scope.order.items[i].medicine) { showToast('Select medicine for all items.', 'error'); return; }
                }

                $scope.loading = true;
                orderService.createOrder($scope.order).then(function(res) {
                    if (res.data.success) {
                        showToast('Order ' + res.data.data.orderNo + ' created!');
                        $state.go('orders');
                    } else {
                        showToast(res.data.message, 'error');
                    }
                    $scope.loading = false;
                }).catch(function(err) {
                    showToast(err.data ? err.data.message : 'Error creating order.', 'error');
                    $scope.loading = false;
                });
            };
        }

        else if ($state.current.name === 'orderDetail') {
            $rootScope.Title = 'Order Detail';
            orderService.getOrder($stateParams.id).then(function(res) {
                if (res.data.success) $scope.order = res.data.data;
            });

            $scope.updateStatus = function(newStatus) {
                orderService.updateStatus($scope.order._id, newStatus).then(function(res) {
                    if (res.data.success) {
                        $scope.order.status = newStatus;
                        showToast('Status updated.');
                    } else {
                        showToast(res.data.message, 'error');
                    }
                });
            };

            $scope.printInvoice = function() { window.print(); };
        }
    }
})();
