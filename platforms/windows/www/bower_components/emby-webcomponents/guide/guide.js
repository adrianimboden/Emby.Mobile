﻿define(['globalize', 'connectionManager', 'loading', 'scrollHelper', 'datetime', 'focusManager', 'imageLoader', 'events', 'layoutManager', 'itemShortcuts', 'registrationservices', 'clearButtonStyle', 'css!./guide.css', 'html!./icons.html', 'scrollStyles'], function (globalize, connectionManager, loading, scrollHelper, datetime, focusManager, imageLoader, events, layoutManager, itemShortcuts, registrationServices) {

    var baseUrl;

    function Guide(options) {

        var self = this;
        var items = {};

        self.refresh = function () {
            reloadPage(options.element);
        };

        self.destroy = function () {
            itemShortcuts.off(options.element);
            items = {};
        };

        self.options = options;

        // 30 mins
        var cellCurationMinutes = 30;
        var cellDurationMs = cellCurationMinutes * 60 * 1000;
        var msPerDay = 86400000;

        var currentDate;

        var channelQuery = {

            StartIndex: 0,
            EnableFavoriteSorting: true
        };

        var channelsPromise;

        function normalizeDateToTimeslot(date) {

            var minutesOffset = date.getMinutes() - cellCurationMinutes;

            if (minutesOffset >= 0) {

                date.setHours(date.getHours(), cellCurationMinutes, 0, 0);

            } else {

                date.setHours(date.getHours(), 0, 0, 0);
            }

            return date;
        }

        function showLoading() {
            loading.show();
        }

        function hideLoading() {
            loading.hide();
        }

        function getChannelLimit(context) {

            return registrationServices.validateFeature('livetv').then(function () {

                var limit = 400;

                context.querySelector('.guideRequiresUnlock').classList.add('hide');

                return limit;

            }, function () {

                var limit = 5;

                context.querySelector('.guideRequiresUnlock').classList.remove('hide');
                context.querySelector('.unlockText').innerHTML = globalize.translate('MessageLiveTvGuideRequiresUnlock', limit);

                return limit;
            });
        }

        function reloadGuide(context, newStartDate) {

            var apiClient = connectionManager.currentApiClient();

            channelQuery.UserId = apiClient.getCurrentUserId();

            getChannelLimit(context).then(function (channelLimit) {

                showLoading();

                channelQuery.Limit = channelLimit;
                channelQuery.AddCurrentProgram = false;

                channelsPromise = channelsPromise || apiClient.getLiveTvChannels(channelQuery);

                var date = newStartDate;
                // Add one second to avoid getting programs that are just ending
                date = new Date(date.getTime() + 1000);

                // Subtract to avoid getting programs that are starting when the grid ends
                var nextDay = new Date(date.getTime() + msPerDay - 2000);

                console.log(nextDay);
                channelsPromise.then(function (channelsResult) {

                    apiClient.getLiveTvPrograms({
                        UserId: apiClient.getCurrentUserId(),
                        MaxStartDate: nextDay.toISOString(),
                        MinEndDate: date.toISOString(),
                        channelIds: channelsResult.Items.map(function (c) {
                            return c.Id;
                        }).join(','),
                        ImageTypeLimit: 1,
                        EnableImageTypes: "Primary,Backdrop",
                        SortBy: "StartDate"

                    }).then(function (programsResult) {

                        renderGuide(context, date, channelsResult.Items, programsResult.Items, apiClient);

                        hideLoading();

                    });
                });
            });
        }

        function getDisplayTime(date) {

            if ((typeof date).toString().toLowerCase() === 'string') {
                try {

                    date = datetime.parseISO8601Date(date, { toLocal: true });

                } catch (err) {
                    return date;
                }
            }

            return datetime.getDisplayTime(date).toLowerCase();
        }

        function getTimeslotHeadersHtml(startDate, endDateTime) {

            var html = '';

            // clone
            startDate = new Date(startDate.getTime());

            html += '<div class="timeslotHeadersInner">';

            while (startDate.getTime() < endDateTime) {

                html += '<div class="timeslotHeader">';

                html += getDisplayTime(startDate);
                html += '</div>';

                // Add 30 mins
                startDate.setTime(startDate.getTime() + cellDurationMs);
            }
            html += '</div>';

            return html;
        }

        function parseDates(program) {

            if (!program.StartDateLocal) {
                try {

                    program.StartDateLocal = datetime.parseISO8601Date(program.StartDate, { toLocal: true });

                } catch (err) {

                }

            }

            if (!program.EndDateLocal) {
                try {

                    program.EndDateLocal = datetime.parseISO8601Date(program.EndDate, { toLocal: true });

                } catch (err) {

                }

            }

            return null;
        }

        function getChannelProgramsHtml(context, date, channel, programs) {

            var html = '';

            var startMs = date.getTime();
            var endMs = startMs + msPerDay - 1;

            programs = programs.filter(function (curr) {
                return curr.ChannelId == channel.Id;
            });

            html += '<div class="channelPrograms">';

            for (var i = 0, length = programs.length; i < length; i++) {

                var program = programs[i];

                if (program.ChannelId != channel.Id) {
                    continue;
                }

                parseDates(program);

                if (program.EndDateLocal.getTime() < startMs) {
                    continue;
                }

                if (program.StartDateLocal.getTime() > endMs) {
                    break;
                }

                items[program.Id] = program;

                var renderStartMs = Math.max(program.StartDateLocal.getTime(), startMs);
                var startPercent = (program.StartDateLocal.getTime() - startMs) / msPerDay;
                startPercent *= 100;
                startPercent = Math.max(startPercent, 0);

                var renderEndMs = Math.min(program.EndDateLocal.getTime(), endMs);
                var endPercent = (renderEndMs - renderStartMs) / msPerDay;
                endPercent *= 100;

                var cssClass = "programCell clearButton itemAction";
                var addAccent = true;

                if (program.IsKids) {
                    cssClass += " childProgramInfo";
                } else if (program.IsSports) {
                    cssClass += " sportsProgramInfo";
                } else if (program.IsNews) {
                    cssClass += " newsProgramInfo";
                } else if (program.IsMovie) {
                    cssClass += " movieProgramInfo";
                }
                else {
                    cssClass += " plainProgramInfo";
                    addAccent = false;
                }

                html += '<button data-action="link" data-isfolder="' + program.IsFolder + '" data-id="' + program.Id + '" data-serverid="' + program.ServerId + '" data-type="' + program.Type + '" class="' + cssClass + '" style="left:' + startPercent + '%;width:' + endPercent + '%;">';

                var guideProgramNameClass = "guideProgramName";

                html += '<div class="' + guideProgramNameClass + '">';

                if (program.IsLive) {
                    html += '<span class="liveTvProgram">' + globalize.translate('core#AttributeLive') + '&nbsp;</span>';
                }
                else if (program.IsPremiere) {
                    html += '<span class="premiereTvProgram">' + globalize.translate('core#AttributePremiere') + '&nbsp;</span>';
                }
                else if (program.IsSeries && !program.IsRepeat) {
                    html += '<span class="newTvProgram">' + globalize.translate('core#AttributeNew') + '&nbsp;</span>';
                }

                html += program.Name;
                html += '</div>';

                if (program.IsHD) {
                    html += '<iron-icon icon="guide:hd"></iron-icon>';
                }

                if (program.SeriesTimerId) {
                    html += '<iron-icon class="seriesTimerIcon" icon="guide:fiber-smart-record"></iron-icon>';
                }
                else if (program.TimerId) {
                    html += '<iron-icon class="timerIcon" icon="guide:fiber-manual-record"></iron-icon>';
                }

                if (addAccent) {
                    html += '<div class="programAccent"></div>';
                }

                html += '</button>';
            }

            html += '</div>';

            return html;
        }

        function renderPrograms(context, date, channels, programs) {

            var html = [];

            for (var i = 0, length = channels.length; i < length; i++) {

                html.push(getChannelProgramsHtml(context, date, channels[i], programs));
            }

            var programGrid = context.querySelector('.programGrid');
            programGrid.innerHTML = html.join('');

            programGrid.scrollTop = 0;
            programGrid.scrollLeft = 0;
        }

        function renderChannelHeaders(context, channels, apiClient) {

            var html = '';

            for (var i = 0, length = channels.length; i < length; i++) {

                var channel = channels[i];
                var hasChannelImage = channel.ImageTags.Primary;
                var dataSrc = '';
                if (hasChannelImage) {

                    var url = apiClient.getScaledImageUrl(channel.Id, {
                        maxHeight: 200,
                        tag: channel.ImageTags.Primary,
                        type: "Primary"
                    });

                    dataSrc = ' data-src="' + url + '"';
                }

                var cssClass = 'channelHeaderCell clearButton itemAction lazy';
                if (hasChannelImage) {
                    cssClass += ' withImage';
                }

                html += '<button type="button" class="' + cssClass + '"' + dataSrc + ' data-action="link" data-isfolder="' + channel.IsFolder + '" data-id="' + channel.Id + '" data-serverid="' + channel.ServerId + '" data-type="' + channel.Type + '">';

                html += '<div class="guideChannelNumber">' + channel.Number + '</div>';

                if (!hasChannelImage) {
                    html += '<div class="guideChannelName">' + channel.Name + '</div>';
                }

                html += '</button>';
            }

            var channelList = context.querySelector('.channelList');
            channelList.innerHTML = html;
            imageLoader.lazyChildren(channelList);
        }

        function renderGuide(context, date, channels, programs, apiClient) {

            //var list = [];
            //channels.forEach(function(i) {
            //    list.push(i);
            //});
            //channels.forEach(function (i) {
            //    list.push(i);
            //});
            //channels.forEach(function (i) {
            //    list.push(i);
            //});
            //channels.forEach(function (i) {
            //    list.push(i);
            //});
            //channels.forEach(function (i) {
            //    list.push(i);
            //});
            //channels.forEach(function (i) {
            //    list.push(i);
            //});
            //channels.forEach(function (i) {
            //    list.push(i);
            //});
            //channels.forEach(function (i) {
            //    list.push(i);
            //});
            //channels.forEach(function (i) {
            //    list.push(i);
            //});
            //channels.forEach(function (i) {
            //    list.push(i);
            //});
            //channels.forEach(function (i) {
            //    list.push(i);
            //});
            //channels.forEach(function (i) {
            //    list.push(i);
            //});
            //channels = list;
            renderChannelHeaders(context, channels, apiClient);

            var startDate = date;
            var endDate = new Date(startDate.getTime() + msPerDay);
            context.querySelector('.timeslotHeaders').innerHTML = getTimeslotHeadersHtml(startDate, endDate);
            items = {};
            renderPrograms(context, date, channels, programs);

            if (layoutManager.tv) {
                focusManager.autoFocus(context.querySelector('.programGrid'), true);
            }
        }

        function nativeScrollTo(container, pos, horizontal) {

            if (container.scrollTo) {
                if (horizontal) {
                    container.scrollTo(pos, 0);
                } else {
                    container.scrollTo(0, pos);
                }
            } else {
                if (horizontal) {
                    container.scrollLeft = Math.round(pos);
                } else {
                    container.scrollTop = Math.round(pos);
                }
            }
        }

        var lastGridScroll = 0;
        var lastHeaderScroll = 0;
        function onProgramGridScroll(context, elem, timeslotHeaders) {

            if ((new Date().getTime() - lastHeaderScroll) >= 1000) {
                lastGridScroll = new Date().getTime();
                nativeScrollTo(timeslotHeaders, elem.scrollLeft, true);
            }
        }

        function onTimeslotHeadersScroll(context, elem, programGrid) {

            if ((new Date().getTime() - lastGridScroll) >= 1000) {
                lastHeaderScroll = new Date().getTime();
                nativeScrollTo(programGrid, elem.scrollLeft, true);
            }
        }

        function getFutureDateText(date) {

            var weekday = [];
            weekday[0] = globalize.translate('core#OptionSundayShort');
            weekday[1] = globalize.translate('core#OptionMondayShort');
            weekday[2] = globalize.translate('core#OptionTuesdayShort');
            weekday[3] = globalize.translate('core#OptionWednesdayShort');
            weekday[4] = globalize.translate('core#OptionThursdayShort');
            weekday[5] = globalize.translate('core#OptionFridayShort');
            weekday[6] = globalize.translate('core#OptionSaturdayShort');

            var day = weekday[date.getDay()];
            date = date.toLocaleDateString();

            if (date.toLowerCase().indexOf(day.toLowerCase()) == -1) {
                return day + " " + date;
            }

            return date;
        }

        function changeDate(page, date) {

            var newStartDate = normalizeDateToTimeslot(date);
            currentDate = newStartDate;

            reloadGuide(page, newStartDate);

            var text = getFutureDateText(date);
            text = '<span class="guideCurrentDay">' + text.replace(' ', ' </span>');
            page.querySelector('.btnSelectDate').innerHTML = text;
        }

        var dateOptions = [];

        function setDateRange(page, guideInfo) {

            var today = new Date();
            today.setHours(today.getHours(), 0, 0, 0);

            var start = datetime.parseISO8601Date(guideInfo.StartDate, { toLocal: true });
            var end = datetime.parseISO8601Date(guideInfo.EndDate, { toLocal: true });

            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);

            if (start.getTime() >= end.getTime()) {
                end.setDate(start.getDate() + 1);
            }

            start = new Date(Math.max(today, start));

            dateOptions = [];

            while (start <= end) {

                dateOptions.push({
                    name: getFutureDateText(start),
                    id: start.getTime()
                });

                start.setDate(start.getDate() + 1);
                start.setHours(0, 0, 0, 0);
            }

            var date = new Date();

            if (currentDate) {
                date.setTime(currentDate.getTime());
            }

            changeDate(page, date);
        }

        function reloadPage(page) {

            showLoading();

            var apiClient = connectionManager.currentApiClient();

            apiClient.getLiveTvGuideInfo().then(function (guideInfo) {

                setDateRange(page, guideInfo);
            });
        }

        function selectDate(page) {

            require(['actionsheet'], function (actionsheet) {

                actionsheet.show({
                    items: dateOptions,
                    title: globalize.translate('core#HeaderSelectDate'),
                    callback: function (id) {

                        var date = new Date();
                        date.setTime(parseInt(id));
                        changeDate(page, date);
                    }
                });

            });
        }

        function createVerticalScroller(view, pageInstance) {

            if (layoutManager.tv) {
                scrollHelper.centerFocus.on(view.querySelector('.smoothScrollY'), false);

                var programGrid = view.querySelector('.programGrid');

                scrollHelper.centerFocus.on(programGrid, true);
            }
        }

        function parentWithClass(elem, className) {

            while (!elem.classList || !elem.classList.contains(className)) {
                elem = elem.parentNode;

                if (!elem) {
                    return null;
                }
            }

            return elem;
        }

        var selectedMediaInfoTimeout;
        var focusedElement;
        function onProgramGridFocus(e) {

            var programCell = parentWithClass(e.target, 'programCell');

            if (!programCell) {
                return;
            }

            focusedElement = e.target;
            if (selectedMediaInfoTimeout) {
                clearTimeout(selectedMediaInfoTimeout);
            }
            selectedMediaInfoTimeout = setTimeout(onSelectedMediaInfoTimeout, 700);
        }

        function onSelectedMediaInfoTimeout() {
            var focused = focusedElement
            if (focused && document.activeElement == focused) {
                var id = focused.getAttribute('data-id');
                var item = items[id];

                if (item) {
                    events.trigger(self, 'focus', [
                    {
                        item: item
                    }]);
                }
            }
        }

        var xhr = new XMLHttpRequest();
        xhr.open('GET', baseUrl + '/tvguide.template.html', true);

        xhr.onload = function (e) {

            var template = this.response;
            var context = options.element;
            context.innerHTML = globalize.translateDocument(template, 'core');

            var programGrid = context.querySelector('.programGrid');
            var timeslotHeaders = context.querySelector('.timeslotHeaders');

            programGrid.addEventListener('focus', onProgramGridFocus, true);
            programGrid.addEventListener('scroll', function () {

                onProgramGridScroll(context, this, timeslotHeaders);
            });

            timeslotHeaders.addEventListener('scroll', function () {
                onTimeslotHeadersScroll(context, this, programGrid);
            });

            context.querySelector('.btnSelectDate').addEventListener('click', function () {
                selectDate(context);
            });

            context.querySelector('.btnUnlockGuide').addEventListener('click', function () {
                reloadPage(context);
            });

            context.classList.add('tvguide');

            createVerticalScroller(context, self);
            itemShortcuts.on(context);

            events.trigger(self, 'load');

            self.refresh();
        }

        xhr.send();
    };

    Guide.setBaseUrl = function (url) {
        baseUrl = url;
    };

    return Guide;
});