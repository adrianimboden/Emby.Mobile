﻿(function(){

	function onFinish() {

		ApiClient.ajax({

            url: ApiClient.getUrl('Startup/Complete'),
            type: 'POST'

        }).done(function () {

            Dashboard.navigate('dashboard.html');
        });
	}

    $(document).on('pageinitdepends', '#wizardFinishPage', function(){

    	$('.btnWizardNext', this).on('click', onFinish);
    });

})();