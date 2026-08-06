(function() {
    'use strict';
    angular.module('app').controller('prescriptionController', Controller);
    Controller.$inject = ['$scope', '$rootScope', '$state', '$stateParams', 'prescriptionService', 'userService', 'medicineService'];

    function Controller($scope, $rootScope, $state, $stateParams, prescriptionService, userService, medicineService) {
        $scope.prescriptions = [];
        $scope.prescription = { medicines: [] };
        $scope.doctors = [];
        $scope.availableMedicines = [];
        $scope.loading = false;
        $scope.filterStatus = '';
        $scope.search = '';
        $scope.page = 1;
        $scope.toast = { show: false, message: '', type: 'success' };

        function showToast(msg, type) {
            $scope.toast = { show: true, message: msg, type: type || 'success' };
            setTimeout(function() { $scope.$apply(function() { $scope.toast.show = false; }); }, 3000);
        }

        function loadDoctors() {
            userService.getUsers({ role: 'doctor', limit: 100 }).then(function(res) {
                if (res.data.success) $scope.doctors = res.data.data;
            });
        }

        function loadMedicines() {
            medicineService.getMedicines({ limit: 1000 }).then(function(res) {
                if (res.data.success) $scope.availableMedicines = res.data.data;
            });
        }

        if ($state.current.name === 'prescriptions') {
            $rootScope.Title = 'Prescriptions';

            $scope.loadPrescriptions = function() {
                $scope.loading = true;
                var params = { page: $scope.page, limit: 20 };
                if ($scope.filterStatus) params.status = $scope.filterStatus;
                if ($scope.search) params.search = $scope.search;

                prescriptionService.getPrescriptions(params).then(function(res) {
                    if (res.data.success) {
                        $scope.prescriptions = res.data.data;
                        $scope.totalPages = res.data.pages;
                    }
                    $scope.loading = false;
                }).catch(function() { $scope.loading = false; });
            };
            $scope.loadPrescriptions();

            $scope.dispense = function(prescription) {
                if (!confirm('Dispense prescription ' + prescription.prescriptionNo + '? This will reduce medicine stock.')) return;
                prescriptionService.dispensePrescription(prescription._id).then(function(res) {
                    if (res.data.success) {
                        prescription.status = 'dispensed';
                        showToast('Prescription dispensed. Stock updated.');
                    } else {
                        showToast(res.data.message, 'error');
                    }
                }).catch(function(err) {
                    showToast(err.data ? err.data.message : 'Error dispensing.', 'error');
                });
            };

            $scope.cancelPrescription = function(prescription) {
                if (!confirm('Cancel prescription ' + prescription.prescriptionNo + '?')) return;
                prescriptionService.deletePrescription(prescription._id).then(function(res) {
                    if (res.data.success) {
                        prescription.status = 'cancelled';
                        showToast('Prescription cancelled.');
                    }
                });
            };
        }

        else if ($state.current.name === 'createPrescription' || $state.current.name === 'editPrescription') {
            $rootScope.Title = $state.current.name === 'editPrescription' ? 'Edit Prescription' : 'Create Prescription';
            loadDoctors();
            loadMedicines();

            if ($state.current.name === 'editPrescription' && $stateParams.id) {
                prescriptionService.getPrescription($stateParams.id).then(function(res) {
                    if (res.data.success) {
                        $scope.prescription = res.data.data;
                        if ($scope.prescription.doctor && $scope.prescription.doctor._id) {
                            $scope.prescription.doctor = $scope.prescription.doctor._id;
                        }
                    }
                });
            }

            $scope.addMedicine = function() {
                $scope.prescription.medicines.push({ medicine: '', medicineName: '', dosage: '', frequency: '', duration: '', quantity: 1 });
            };

            $scope.removeMedicine = function(idx) {
                $scope.prescription.medicines.splice(idx, 1);
            };

            $scope.onMedicineSelect = function(item) {
                var med = $scope.availableMedicines.find(function(m) { return m._id === item.medicine; });
                if (med) item.medicineName = med.name;
            };

            $scope.onDoctorSelect = function() {
                var doc = $scope.doctors.find(function(d) { return d._id === $scope.prescription.doctor; });
                if (doc) $scope.prescription.doctorName = doc.name;
            };

            $scope.savePrescription = function() {
                $scope.IsSubmit = true;
                if (!$scope.prescription.patientName || !$scope.prescription.patientAge) {
                    showToast('Patient name and age required.', 'error');
                    return;
                }

                var promise = $state.current.name === 'editPrescription'
                    ? prescriptionService.updatePrescription($scope.prescription)
                    : prescriptionService.createPrescription($scope.prescription);

                promise.then(function(res) {
                    if (res.data.success) {
                        showToast('Prescription saved!');
                        $state.go('prescriptions');
                    } else {
                        showToast(res.data.message, 'error');
                    }
                }).catch(function(err) {
                    showToast(err.data ? err.data.message : 'Error saving.', 'error');
                });
            };
        }
    }
})();