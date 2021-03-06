define(['appStorage', 'browser'], function (appStorage, browser) {

    function getDeviceProfile() {

        // TODO
        return null;
    }

    function getCapabilities() {

        var caps = {
            PlayableMediaTypes: ['Audio', 'Video'],

            SupportsPersistentIdentifier: false,
            DeviceProfile: getDeviceProfile()
        };

        return caps;
    }

    var appInfo;

    return {
        getWindowState: function () {
            return document.windowState || 'Normal';
        },
        setWindowState: function (state) {
            alert('setWindowState is not supported and should not be called');
        },
        exit: function () {
            alert('exit is not supported and should not be called');
        },
        supports: function (command) {

            var features = [];

            if (!browser.safari) {
                features.push('filedownload');
            }
            features.push('sharing');

            return features.indexOf(command.toLowerCase()) != -1;
        },
        appInfo: function () {

            if (appInfo) {
                return Promise.resolve(appInfo);
            }

            return new Promise(function (resolve, reject) {

                document.addEventListener("deviceready", function () {

                    cordova.getAppVersion.getVersionNumber(function (appVersion) {

                        var name = browserInfo.android ? "Emby for Android Mobile" : (browserInfo.safari ? "Emby for iOS" : "Emby Mobile");

                        // Remove special characters
                        var cleanDeviceName = device.model.replace(/[^\w\s]/gi, '');

                        var deviceId = null;

                        if (window.MainActivity) {

                            deviceId = appStorage.getItem('legacyDeviceId');
                        }

                        appInfo = {
                            deviceId: deviceId || device.uuid,
                            deviceName: cleanDeviceName,
                            appName: name,
                            appVersion: appVersion
                        };

                        resolve(appInfo);

                    });

                }, false);
            });
        },
        capabilities: getCapabilities
    };
});