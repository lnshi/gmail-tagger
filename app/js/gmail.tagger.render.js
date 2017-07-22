var GMAIL_TAGGER = GMAIL_TAGGER || {};

GMAIL_TAGGER.selectorConstant = {
  mailListTrNew: '.zA.zE',
  mailListTrHasBeenRead: '.zA.yO',

  mailerTd: '.yX.xY',

  mailTitleTd: 'xY a4W',

  gmailPrimaryTab: 'div[aria-label="Primary"]',
  tabSelectedAttr: 'aria-selected'
};

GMAIL_TAGGER.htmlTpl = {
  handle: '<div class="GMAIL_TAGGER-handle" id="GMAIL_TAGGER-popup-handle-id-WILL-BE-DYNAMICALLY-REPLACED"></div>',
  popup: '\
          <div class="GMAIL_TAGGER-popup" id="GMAIL_TAGGER-popup-id-WILL-BE-DYNAMICALLY-REPLACED">\
            <div class="GMAIL_TAGGER-arrow"></div>\
            <div class="GMAIL_TAGGER-tag-con">\
              <input class="GMAIL_TAGGER-tag" type="text" placeholder="tag me" id="GMAIL_TAGGER-tag-input-id-WILL-BE-DYNAMICALLY-REPLACED">\
              <button class="GMAIL_TAGGER-save" type="button">Save</button>\
            </div>\
          </div>\
  ',
  tag: '<div class="GMAIL_TAGGER-tag-label" id="GMAIL_TAGGER-tags-label-id-WILL-BE-DYNAMICALLY-REPLACED"></div>'
};

GMAIL_TAGGER.vars = {
  popupIds: [],
  gmailTaggerTimer: null
};

GMAIL_TAGGER.utils = {
  generateGUID: function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
  },

  checkIsValidHtmlIdCharacter: function(char) {
    if (char in ['-', '_', ':', '.']) {
      return true;
    } else {
      var asciiCode = char.charCodeAt(0);
      // 48 - 57 : 0 - 9
      // 65 - 90 : A - Z
      // 97 - 122 : a - z
      //
      // Watch a <= b <= c
      if ((asciiCode >= 48 && asciiCode <= 57)
            || (asciiCode >= 65 && asciiCode <= 90)
            || (asciiCode >= 97 && asciiCode <= 122)) {
        return true;
      }
    }

    return false;
  },

  cleanEmailTitleForHtmlId: function(emailTitle) {
    var tmpArr = [];
    for (var i = 0; i < emailTitle.length; i++) {
      if (GMAIL_TAGGER.utils.checkIsValidHtmlIdCharacter(emailTitle.charAt(i))) {
        tmpArr.push(emailTitle.charAt(i));
      } else {
        tmpArr.push(String(emailTitle.charAt(i).charCodeAt(0)));
      }
    }
    return tmpArr.join('');
  },

  checkIsInboxAndPrimaryTab: function() {
    var currentUrl = window.location.href;
    if (currentUrl.indexOf('inbox') + 5 === currentUrl.length) {
      // Here the return type is 'string'.
      var isPrimaryTabSelected = $(GMAIL_TAGGER.selectorConstant.gmailPrimaryTab).attr(GMAIL_TAGGER.selectorConstant.tabSelectedAttr);
      if (isPrimaryTabSelected === 'true') {
        return true;
      }
    }
    return false;
  }
};

GMAIL_TAGGER.funcs = {
  init: function() {
    // Clear chrome.storage.sync
    // chrome.storage.sync.clear();

    // Aggregate all has been read email and new email
    var emailsDom = [];

    $.each($(GMAIL_TAGGER.selectorConstant.mailListTrNew + ' ' + GMAIL_TAGGER.selectorConstant.mailerTd), function(idx, val) {
      emailsDom.push(val);
    });

    $.each($(GMAIL_TAGGER.selectorConstant.mailListTrHasBeenRead + ' ' + GMAIL_TAGGER.selectorConstant.mailerTd), function(idx, val) {
      emailsDom.push(val);
    });

    $.each(emailsDom, function(idx, val) {
      // This pieces of code only need to be proceeded on 'new email'.
      var tmpTd = $(val);

      var isDomExisting = tmpTd.find('.GMAIL_TAGGER-handle').length > 0
                                    || tmpTd.find('.GMAIL_TAGGER-popup').length > 0
                                    || tmpTd.find('.GMAIL_TAGGER-tag-label').length > 0;

      if (!isDomExisting) {
        tmpTd.css('position', 'relative');

        // var generatedEmailId = tmpTd.children().first().children().first().attr('email').replace(/@/g, '').replace(/\./g, '');

        var generatedEmailId = null;

        var tmpSpan = tmpTd.find('span');
        for (var idx in tmpSpan) {
          var tmpEmail = $(tmpSpan[idx]).attr('email');
          if (tmpEmail) {
            generatedEmailId = tmpEmail.replace(/@/g, '').replace(/\./g, '');
            break;
          }
        }

        // Try to get the 'Title' of the email.
        var emailTitle = null;

        var newEmailTitleDom = tmpTd.next().next().find('b');
        if (newEmailTitleDom && newEmailTitleDom.length > 0) {
          emailTitle = $(newEmailTitleDom[0]).text();
        } else {
          emailTitle = $(tmpTd.next().next().find('span')[0]).text();
        }

        var cleanedEmailTitle = GMAIL_TAGGER.utils.cleanEmailTitleForHtmlId(emailTitle);

        var popupHandleGeneratedId = 'PH-' + generatedEmailId + '-' + cleanedEmailTitle;
        var popupGeneratedId = 'PU-' + generatedEmailId + '-' + cleanedEmailTitle;
        var tagInputGeneratedId = 'I-' + generatedEmailId + '-' + cleanedEmailTitle;
        var tagLabelGeneratedId = 'L-' + generatedEmailId + '-' + cleanedEmailTitle;

        GMAIL_TAGGER.vars.popupIds.push(popupGeneratedId);

        tmpTd.append(GMAIL_TAGGER.htmlTpl.handle.replace('GMAIL_TAGGER-popup-handle-id-WILL-BE-DYNAMICALLY-REPLACED', popupHandleGeneratedId));

        tmpTd.append(GMAIL_TAGGER.htmlTpl.popup.replace('GMAIL_TAGGER-popup-id-WILL-BE-DYNAMICALLY-REPLACED', popupGeneratedId)
                                               .replace('GMAIL_TAGGER-tag-input-id-WILL-BE-DYNAMICALLY-REPLACED', tagInputGeneratedId)
        );

        tmpTd.append(GMAIL_TAGGER.htmlTpl.tag.replace('GMAIL_TAGGER-tags-label-id-WILL-BE-DYNAMICALLY-REPLACED', tagLabelGeneratedId));

      }

      var tagInputId = $(tmpTd.find('.GMAIL_TAGGER-handle')[0]).attr('id').replace('PH-', 'I-');

      // Show view according to the tags in 'chrome.storage.sync'.
      (function(tagInputId) {
        chrome.storage.sync.get(tagInputId, function(tags) {
          if (tags[tagInputId]) {
            var tmpTagLabelDom = $('#' + tagInputId.replace('I-', 'L-'));

            tmpTagLabelDom.text(tags[tagInputId]['val']);

            $('#' + tagInputId.replace('I-', 'PH-')).hide();

            tmpTagLabelDom.show();

          } else {
            $('#' + tagInputId.replace('I-', 'L-')).empty();
            $('#' + tagInputId.replace('I-', 'PH-')).show();
          }
        });
      })(tagInputId);

    });
  },

  bindPopupEvent: function() {
    // Aggregate all popup handle dom.
    var popupHandleDom = [];

    $.each($(GMAIL_TAGGER.selectorConstant.mailListTrNew + ' ' + GMAIL_TAGGER.selectorConstant.mailerTd + ' .GMAIL_TAGGER-handle'), function(idx, val) {
      popupHandleDom.push(val);
    });

    $.each($(GMAIL_TAGGER.selectorConstant.mailListTrHasBeenRead + ' ' + GMAIL_TAGGER.selectorConstant.mailerTd + ' .GMAIL_TAGGER-handle'), function(idx, val) {
      popupHandleDom.push(val);
    });

    $.each(popupHandleDom, function(idx, val) {

      var existingEvents = $._data(this, 'events');

      // Since we only use the 'click' event, so only check the 'existingEvents' is enough.
      if (!existingEvents) {
        $(val).click((function(event, popupId) {
          return function() {
            $.each(GMAIL_TAGGER.vars.popupIds, function(idx, val) {
              if (val !== popupId) {
                $('#' + val).hide();
              }
            });
            
            $('#' + popupId).show();

            $('#' + popupId.replace('PU-', 'I-')).focus();

            return false;
          };
        })(event, $(val).next().attr('id')));
      }

    });
  },

  blockClickOnPopup: function() {
    $.each($('.GMAIL_TAGGER-popup'), function(idx, val) {

      var existingEvents = $._data(this, 'events');

      if (!existingEvents) {
        $(val).click(function() {
          return false;
        });
      }
      
    });
  },

  bindTagSaveEvent: function() {
    $.each($('.GMAIL_TAGGER-save'), function(idx, val) {

      var existingEvents = $._data(this, 'events');

      if (!existingEvents) {
        $(val).click((function(event, tagInputId) {
          return function() {
            var tagVal = $('#' + tagInputId).val()

            if (tagVal && tagVal.trim().length !== 0) {
              var tmp = {};
              tmp[tagInputId] = {
                'val': tagVal,
                'createdAt': $.now()
              };

              chrome.storage.sync.set(tmp, function() {
                $('#' + tagInputId.replace('I-', 'PH-')).hide();
                $('#' + tagInputId.replace('I-', 'PU-')).hide();

                var tmpTagLabelDom = $('#' + tagInputId.replace('I-', 'L-'));
                tmpTagLabelDom.text(tagVal);
                tmpTagLabelDom.show();

                // Extension can only store at most 512 items into 'chrome.storage.sync'.
                // So, here will check if we already stored more than 90% of the amount,
                //   that means we already stored more than 512 * 0.9 = 460 items,
                //   under this situation the procedure will remove the oldest 200 items
                //   from the storage according to the 'createdAt' field in the record.
                chrome.storage.sync.get(null, function(tags) {
                  var tmpTagArr = [];
                  for (var key in tags) {
                    tmpTagArr.push({
                      'key': key,
                      'val': tags[key]['val'],
                      'createdAt': tags[key]['createdAt']
                    });
                  }

                  if (tmpTagArr.length >= 460) {
                    tmpTagArr.sort(function(a, b) {
                      return a['createdAt'] - b['createdAt']
                    });

                    for (var idx in tmpTagArr) {
                      if (idx < 200) {
                        chrome.storage.sync.remove(tmpTagArr[idx]['key']);
                      } else {
                        break;
                      }
                    }
                  }

                });
              });

            } else {

              var afterTagUpdate = function() {
                $('#' + tagInputId.replace('I-', 'PU-')).hide();

                var tmpTagLabelDom = $('#' + tagInputId.replace('I-', 'L-'));
                
                tmpTagLabelDom.empty();
                tmpTagLabelDom.hide();

                $('#' + tagInputId.replace('I-', 'PH-')).show();
              };

              // Because of the restriction that in one hour you can only do up to 1800 operations(set, remove, clear) to chrome.storage.sync,
              // so here we use 'get' to check first.
              chrome.storage.sync.get(tagInputId, function(tags) {
                if (tags[tagInputId]) {
                  chrome.storage.sync.remove(tagInputId, afterTagUpdate);
                } else {
                  afterTagUpdate();
                }
              });

            }

          };
          
        })(event, $(val).prev().attr('id')));
      }
      
    });
  },

  bindTagEditEvent: function() {
    $.each($('.GMAIL_TAGGER-tag-label'), function(idx, val) {

      var existingEvents = $._data(this, 'events');

      if (!existingEvents) {
        $(val).click((function(event, tagLabelId) {
          return function() {
            var tmpPopupId = tagLabelId.replace('L-', 'PU-');

            $.each(GMAIL_TAGGER.vars.popupIds, function(idx, val) {
              if (val !== tmpPopupId) {
                $('#' + val).hide();
              }
            });
            
            var oldTag = $('#' + tagLabelId).text();
            var tmpTagInputDom = $('#' + tmpPopupId.replace('PU-', 'I-'));

            tmpTagInputDom.val(oldTag);

            $('#' + tmpPopupId).show();

            return false;
          };
        })(event, $(val).attr('id')));
      }
      
    });
  },

  repeatableLoop: function() {
    if (GMAIL_TAGGER.utils.checkIsInboxAndPrimaryTab()) {
      // Prepare the necessary dom elements.
      GMAIL_TAGGER.funcs.init();

      // If you haven't tagged one email, then you will be able to see the 'creating tags handle(Yin and Yang icon) beside the mailer column'.
      // This step is for binding the click event to the 'creating tags handle', for when the handle is clicked then show up the 'creating tag popup'.
      GMAIL_TAGGER.funcs.bindPopupEvent();

      // This step is for preventing opening the email when user try to focus on the 'tag input' in 'creating tag popup'.
      GMAIL_TAGGER.funcs.blockClickOnPopup();

      // This step is for binding the click event to the 'tag save' button, for when the 'tag save' button is clicked then: 
      //   1. save(set, remove) the tags in 'chrome.storage.sync'.
      //   2. dismiss the 'creating tag popup'.
      GMAIL_TAGGER.funcs.bindTagSaveEvent();

      // This step is for binding the click event on 'tags label' to edit the already created tags.
      GMAIL_TAGGER.funcs.bindTagEditEvent();
    }
  }

};

window.addEventListener('load', function() {

  // This one is for dealing with the url changes, coz some of the url changes will cause the page refresh,
  //   then the injected dom will be lost.
  $(window).on('hashchange', function() {
    GMAIL_TAGGER.funcs.repeatableLoop();
  });

  // This one is for dealing with the unpredictable potential click on the body which:
  //   will not cause the hash change,
  //   but will refresh the partial page and still cause the injected dom to be lost.
  $('body').click(function(event) {
    var isDomExisting = $('body').find('.GMAIL_TAGGER-handle').length > 0
                                  || $('body').find('.GMAIL_TAGGER-popup').length > 0
                                  || $('body').find('.GMAIL_TAGGER-tag-label').length > 0;

    if (!isDomExisting) {
      GMAIL_TAGGER.funcs.repeatableLoop();
    }

  });

  // Invoke once at the very beginning.
  GMAIL_TAGGER.funcs.repeatableLoop();

  // Invoke and check every 30 seconds, for dealing with the new coming in email.
  GMAIL_TAGGER.vars.gmailTaggerTimer = setInterval(GMAIL_TAGGER.funcs.repeatableLoop, 30000);

}, false)


