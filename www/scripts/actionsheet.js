﻿(function(){function onClosed(){$(this).remove();}
function show(options){require(['paperbuttonstyle'],function(){var id='dlg'+new Date().getTime();var html='';var style="";if(options.positionTo){var pos=$(options.positionTo).offset();pos.top+=$(options.positionTo).innerHeight()/2;pos.left+=$(options.positionTo).innerWidth()/2;pos.top-=24;pos.left-=24;pos.top-=100;pos.left-=80;pos.top-=$(window).scrollTop();pos.left-=$(window).scrollLeft();pos.top=Math.max(pos.top,0);pos.left=Math.max(pos.left,0);style+='position:fixed;top:'+pos.top+'px;left:'+pos.left+'px';}
html+='<paper-dialog id="'+id+'" entry-animation="scale-up-animation" exit-animation="fade-out-animation" with-backdrop style="'+style+'">';if(options.title){html+='<h2>';html+=options.title;html+='</h2>';}
html+='<paper-dialog-scrollable>';for(var i=0,length=options.items.length;i<length;i++){var option=options.items[i];html+='<paper-button class="block menuButton ripple btnOption" data-id="'+option.id+'" style="margin:0;">';html+='<span>'+option.name+'</span>';html+='</paper-button>';}
html+='</paper-dialog-scrollable>';if(options.showCancel){html+='<div class="buttons">';html+='<paper-button dialog-dismiss>'+Globalize.translate('ButtonCancel')+'</paper-button>';html+='</div>';}
html+='</paper-dialog>';$(html).appendTo(document.body);setTimeout(function(){var dlg=document.getElementById(id);dlg.open();$(dlg).css('z-index','999999').on('iron-overlay-closed',onClosed);$('.btnOption',dlg).on('click',function(){if(options.callback){options.callback(this.getAttribute('data-id'));}
dlg.close();});},100);});}
window.ActionSheetElement={show:show};})();