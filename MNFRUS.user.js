// ==UserScript==
// @name        MNFRUS
// @namespace   gucaguca
// @description Meguca NameFag Removal UserScript
// @include     https://meguca.org/*
// @version     1
// @grant       none
// @run-at      document-end
// ==/UserScript==

// ================== CONFIG ==================

// Add names you want to filter
var filterList = ["Like this", "or this", "PT"];

// Set to true if you want to hide the delete counter
var hideFilterCount = false;

// Set to true if you want posts to be completely invisible
var invisibleDelete = false;

// Set to false to disable chain filtering
// var chainFiltering = true;

// Set to true to enable regex filtering
// var enableRegex = false

// ================== MEMBERS ================== 

var deletedPostCount = 0;
var removedCountElement;
var threadContainer = document.getElementById("thread-container");

// ================== FUNCTIONS ==================

function postCreationHandler(mutationRecords) {
  mutationRecords.forEach(function(mutation) {
    for (var post of mutation.addedNodes) {
      removePost(post);
    }
  });
}

function removePost(post) {
  // Need to search by name because children of the post seem to differ between observer and manual call
  var postName = post.childNodes[1].getElementsByClassName("name")[0].childNodes[0].innerHTML;
  
  // Go through list of filters, remove and break on match
  for (var filterName of filterList) {
    if (filterName == postName) {
      if (invisibleDelete) {
        var oldAttr = post.getAttribute("style");
        if (oldAttr == null)
          oldAttr = "";
        post.setAttribute("style", oldAttr + "display: none;");
      } else {
        if (!post.className.includes("deleted"))
          post.className += " deleted";
      }
         
      deletedPostCount++;
      updateRemovedCounter();
        
      break;
    }
  }
}

function createRemovedCounter() {
  var removedCountContent = document.createTextNode(deletedPostCount);
  removedCountElement = document.createElement("b");
  removedCountElement.setAttribute("class", "act hide-empty banner-float");
  removedCountElement.setAttribute("title", "Removed Posts");
  removedCountElement.appendChild(removedCountContent);
  document.getElementById("banner").insertBefore(removedCountElement, document.getElementById("thread-post-counters"));
}

function updateRemovedCounter() {
  removedCountElement.innerHTML = deletedPostCount;
}

// ================== SCRIPT ==================

var newPostObserver   = new MutationObserver(postCreationHandler);
var obsConfig         = { childList: true };

// Create Filtered Counter on top
if (!hideFilterCount)
    createRemovedCounter();

// Start new post observer
newPostObserver.observe(threadContainer, obsConfig);

// Delete old posts
var oldPosts = Array.prototype.slice.call(threadContainer.getElementsByTagName('article'));
oldPosts.shift(); // Ignore OP
oldPosts.forEach(removePost);