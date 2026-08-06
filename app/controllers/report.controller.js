(function() {
    'use strict';
    angular.module('app').controller('reportController', Controller);
    Controller.$inject = ['$scope', '$rootScope', '$http', 'globalConfig'];

    function Controller($scope, $rootScope, $http, globalConfig) {
        $rootScope.Title = 'System Reports';
        $scope.reportType = 'sales';
        $scope.reportData = [];
        $scope.summary = {};
        $scope.loading = false;
        $scope.startDate = '';
        $scope.endDate = '';

        $scope.loadReport = function() {
            $scope.loading = true;
            var url = globalConfig.apiAddress + '/report/' + $scope.reportType;
            var params = {};
            if ($scope.startDate) params.startDate = $scope.startDate;
            if ($scope.endDate) params.endDate = $scope.endDate;

            $http.get(url, { params: params }).then(function(res) {
                if (res.data.success) {
                    $scope.reportData = res.data.data;
                    $scope.summary = res.data.summary || {};
                }
                $scope.loading = false;
            }).catch(function() { $scope.loading = false; });
        };

        $scope.loadReport();

        $scope.exportCSV = function() {
            if (!$scope.reportData || !$scope.reportData.length) return;
            var keys = Object.keys($scope.reportData[0]).filter(function(k) { return typeof $scope.reportData[0][k] !== 'object'; });
            var csv = keys.join(',') + '\n';

            $scope.reportData.forEach(function(row) {
                var line = keys.map(function(k) { return '"' + (row[k] || '') + '"'; }).join(',');
                csv += line + '\n';
            });

            var blob = new Blob([csv], { type: 'text/csv' });
            var link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = $scope.reportType + '_report.csv';
            link.click();
        };

        $scope.printReport = function() {
            window.print();
        };
    }
})();
