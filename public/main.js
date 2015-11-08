var APP_MODULE = angular.module('arpisea', ['ui.bootstrap'])

	.controller('AppCtrl', ['$scope', function($scope) {

	}])


	.controller('TesterCtrl', ['$scope', 'RPC',  function($scope, RPC) {

		$scope.form = {};

		$scope.execMethod = function(evt) {

			var disabledClass = 'disabled';

			var btn = $(evt.currentTarget);

			if (btn.hasClass(disabledClass)) {
				return;
			}

			btn.addClass(disabledClass);

			RPC.req($scope.method, $scope.form, function(err, result) {
				btn.removeClass(disabledClass);
				$scope.output = JSON.stringify(err || result, null, "  ");
			});
		}
	}])

	.directive('methodTester', ['$compile', function($compile) {
		return {
			restrict: 'A',
			controller: 'TesterCtrl',
			scope: {
				method: "@methodTester"
			},
			link: function(scope, element) {
				$compile(element.contents())(scope); //<---- recompilation
			}
		}
	}])

	.factory( 'RPC', [
		'$http',
		'rpcUrl',
		function($http, rpcUrl) {

			var requestId = 1;

			return {
				responseHandler: function( promise, callback ) {
					var self = this;

					promise
						.success( function( data ) {
							if (!data) {
								callback( 'Error with the response.' );
							}
							else if (data.error) {
								callback(data.error);
							}
							else {
								callback(null, data.result);
							}
						})
						.error( function( data ) {
							self.handleError( data );
							callback( data );
						});
				},

				rpcWrapper: function( method, params ) {
					return {
						jsonrpc: '2.0',
						id: this.generateRequestId(),
						method: method,
						params: params || {}
					};
				},

				generateRequestId: function() {
					return ++requestId + '';
				},

				req: function req(method, params, callback) {

					if ( typeof params === 'function' ) {
						callback = params;
						params = undefined;
					}

					if ( typeof callback !== 'function' ) {
						callback = angular.noop;
					}

					this.responseHandler($http.post(rpcUrl, this.rpcWrapper(method, params)), callback);
				}
			}
		}
	]);
