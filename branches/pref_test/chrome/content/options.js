// process prefwindow and handle all access to preference
//
// Created by ChihHao <u881831@hotmail.com>
// Little part of the code is taken from BBSFox developed by
// Ett Chung <ettoolong@hotmail.com>
// https://addons.mozilla.org/zh-TW/firefox/addon/179388/

function PCManOptions() {
    this.confFile = Components.classes["@mozilla.org/file/directory_service;1"]
                             .getService(Components.interfaces.nsIProperties)
                             .get("ProfD", Components.interfaces.nsIFile);
    this.confFile.append('pcmanfx.ini');
    if( !this.confFile.exists() )
        this.confFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0666);

    this.prefs = new IniFile();
    this.prefs.load(this.confFile);
    if( !this.prefs.groups['default'] ) {
        this.reset('default');
        this.prefs.save(this.confFile);
    }
    this.getBookmarkIDs();
}

PCManOptions.prototype = {
    getBookmarkIDs: function() {
        var names = this.prefs.getGroupNames();
        this.bookmarkIDs = [];
        for(var i=0; i<names.length; ++i) {
            if(names[i] != 'default') {
                var id = parseInt(names[i].substr(6));
                this.bookmarkIDs.push(id);
            }
        }
    },

    getGroupName: function(url) {
        var browserutils = new BrowserUtils();
        var bookmarkID = browserutils.findBookmarkID(url);
        var group = bookmarkID ? ('rdf:#$' + bookmarkID) : 'default';
        if( !this.prefs.groups[group] ) // Not created, use default
            group = 'default';
        return group;
    },

    create: function(url) {
        var browserutils = new BrowserUtils();
        var bookmarkID = browserutils.findBookmarkID(url);
        if(bookmarkID) {
            var group = 'rdf:#$' + bookmarkID;
            this.reset(group);
            this.prefs.save(this.confFile);
            return true;
        } else {
            return false;
        }
    },

    init: function() {
        var browserutils = new BrowserUtils();
        var bookmarkService = browserutils._bookmarkService;
        var validIDs = [];
        for(var i=0; i<this.bookmarkIDs.length; ++i) {
            try {
                var bookmarkTitle = bookmarkService.getItemTitle(this.bookmarkIDs[i]);
                document.getElementById('siteList').appendItem(bookmarkTitle);
                validIDs.push(this.bookmarkIDs[i]);
            } catch (e) { // the bookmark may be removed
                delete this.prefs.groups['rdf:#$' + this.bookmarkIDs[i]];
            }
        }
        this.bookmarkIDs = validIDs;
        this.recentGroup = 'default';
        this.load(this.recentGroup);
    },

    siteChanged: function() {
        this.save(this.recentGroup);
        var siteList = document.getElementById('siteList');
        var siteIndex = siteList.getIndexOfItem(siteList.selectedItems[0]);
        if(siteIndex == 0)
            var groupname = 'default';
        else
            var groupname = 'rdf:#$' + this.bookmarkIDs[siteIndex-1];
        this.recentGroup = groupname;
        this.load(this.recentGroup);
    },

    accept: function() {
        this.save(this.recentGroup);
        this.prefs.save(this.confFile);

        // taken from BBSFox
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                           .getService(Components.interfaces.nsIWindowMediator);

        var browserEnumerator = wm.getEnumerator("navigator:browser");
        while(browserEnumerator.hasMoreElements()) {
            var browserInstance = browserEnumerator.getNext().getBrowser();
            var numTabs = browserInstance.tabContainer.childNodes.length;
            for(var index=0; index<numTabs; index++) {
                var currentBrowser = browserInstance.getBrowserAtIndex(index);
                var urlstr = currentBrowser.currentURI.spec;
                if(urlstr.length<=9) // Invalid
                    continue;
                var urlheader = urlstr.substr(0,9);
                if(urlheader.toLowerCase()!="telnet://") // Not a BBS page
                    continue;
                var doc = currentBrowser.contentDocument;
                if(doc && ("createEvent" in doc)) {
                    var evt = doc.createEvent("Events");
                    evt.initEvent("PrefChanged", true, false);
                    doc.dispatchEvent(evt);
                }
            }
        }
    },

    load: function(group) {
        document.getElementById('Charset').value = this.prefs.getStr(group, 'Encoding', 'big5');
    },

    save: function(group) {
        this.prefs.setStr(group, 'Encoding', document.getElementById('Charset').value);
    },

    reset: function(group) {
        this.prefs.setStr(group, 'Encoding', 'big5');
    }
}

// detect whether the page loading this script is prefwindow or not
// Other page may load this script for creating SitePref or something else
if(document.getElementById('pcmanOption')) {

    function load() {
        options = new PCManOptions();
        options.init();

        var app = Components.classes["@mozilla.org/fuel/application;1"]
                            .getService(Components.interfaces.fuelIApplication);
        if(app.extensions) {
            var ver = app.extensions.get('pcmanfx2@pcman.org').version;
            document.getElementById('version').value = ver;
        } else {
            Components.utils.import("resource://gre/modules/AddonManager.jsm");
            AddonManager.getAddonByID('pcmanfx2@pcman.org', function(addon) {
                document.getElementById('version').value = addon.version;
            });
        }
    }

    function siteChanged() { options.siteChanged(); }

    function save() { options.accept(); }

}