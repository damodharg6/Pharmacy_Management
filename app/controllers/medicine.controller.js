(function() {
    'use strict';
    angular.module('app').controller('medicineController', Controller);
    Controller.$inject = ['$scope', '$rootScope', '$state', '$stateParams', 'medicineService', 'categoryService'];

    function Controller($scope, $rootScope, $state, $stateParams, medicineService, categoryService) {
        $scope.medicines = [];
        $scope.categories = [];
        $scope.medicine = {};
        $scope.loading = false;
        $scope.search = '';
        $scope.filterCategory = '';
        $scope.filterLowStock = false;
        $scope.page = 1;
        $scope.totalPages = 1;
        $scope.total = 0;
        $scope.toast = { show: false, message: '', type: 'success' };

        function showToast(msg, type) {
            $scope.toast = { show: true, message: msg, type: type || 'success' };
            setTimeout(function() { $scope.$apply(function() { $scope.toast.show = false; }); }, 3000);
        }

        function loadCategories() {
            categoryService.getCategories().then(function(res) {
                if (res.data.success) $scope.categories = res.data.data;
            });
        }

        if ($state.current.name === 'medicines' || $state.current.name === 'lowStock') {
            $rootScope.Title = $state.current.name === 'lowStock' ? 'Low Stock Medicines' : 'Medicine Inventory';

            $scope.loadMedicines = function() {
                $scope.loading = true;
                var params = { page: $scope.page, limit: 20 };
                if ($scope.search) params.search = $scope.search;
                if ($scope.filterCategory) params.category = $scope.filterCategory;
                if ($scope.filterLowStock || $state.current.name === 'lowStock') params.lowStock = 'true';

                medicineService.getMedicines(params).then(function(res) {
                    if (res.data.success) {
                        $scope.medicines = res.data.data;
                        $scope.total = res.data.total;
                        $scope.totalPages = res.data.pages;
                    }
                    $scope.loading = false;
                }).catch(function() { $scope.loading = false; });
            };

            loadCategories();
            $scope.loadMedicines();

            $scope.deleteMedicine = function(id, name) {
                if (!confirm('Delete ' + name + '?')) return;
                medicineService.deleteMedicine(id).then(function(res) {
                    if (res.data.success) {
                        showToast(name + ' deleted.');
                        $scope.loadMedicines();
                    } else {
                        showToast(res.data.message, 'error');
                    }
                });
            };

            $scope.adjustStock = function(medicine) {
                $scope.selectedMedicine = medicine;
                $scope.stockAdjustment = { quantity: 0, transactionType: 'purchase', notes: '' };
                $scope.showStockModal = true;
            };

            $scope.saveStockAdjustment = function() {
                if (!$scope.stockAdjustment.quantity) return;
                medicineService.adjustStock($scope.selectedMedicine._id, $scope.stockAdjustment).then(function(res) {
                    if (res.data.success) {
                        showToast('Stock updated for ' + $scope.selectedMedicine.name);
                        $scope.showStockModal = false;
                        $scope.loadMedicines();
                    } else {
                        showToast(res.data.message, 'error');
                    }
                });
            };

            $scope.nextPage = function() { if ($scope.page < $scope.totalPages) { $scope.page++; $scope.loadMedicines(); } };
            $scope.prevPage = function() { if ($scope.page > 1) { $scope.page--; $scope.loadMedicines(); } };
        }

        else if ($state.current.name === 'createMedicine' || $state.current.name === 'editMedicine') {
            $rootScope.Title = $state.current.name === 'editMedicine' ? 'Edit Medicine' : 'Add Medicine';
            loadCategories();

            if ($state.current.name === 'editMedicine' && $stateParams.id) {
                medicineService.getMedicine($stateParams.id).then(function(res) {
                    if (res.data.success) {
                        $scope.medicine = res.data.data;
                        if ($scope.medicine.category && $scope.medicine.category._id) {
                            $scope.medicine.category = $scope.medicine.category._id;
                        }
                    }
                });
            }

            $scope.saveMedicine = function() {
                $scope.IsSubmit = true;
                if (!$scope.medicine.name || !$scope.medicine.category || $scope.medicine.price === undefined) {
                    showToast('Please fill all required fields.', 'error');
                    return;
                }
                var promise = $state.current.name === 'editMedicine'
                    ? medicineService.updateMedicine($stateParams.id, $scope.medicine)
                    : medicineService.createMedicine($scope.medicine);

                promise.then(function(res) {
                    if (res.data.success) {
                        showToast('Medicine saved successfully.');
                        $state.go('medicines');
                    } else {
                        showToast(res.data.message, 'error');
                    }
                }).catch(function(err) {
                    showToast(err.data ? err.data.message : 'Error saving medicine.', 'error');
                });
            };
        }
    }
})();
