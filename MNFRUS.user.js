// ==UserScript==
// @name        MNFRUS
// @namespace   gucaguca
// @description Meguca NameFag Removal UserScript
// @include     https://meguca.org/*
// @version     1.1
// @grant       none
// @run-at      document-end
// ==/UserScript==

// ================== CONFIG ==================

// Add names you want to filter
var filterList = ["Like this", "or this"];

// Set to true if you want to hide the delete counter
var hideFilterCount = false;

// Set to true if you want posts to be completely invisible
var invisibleDelete = false;

// Set to false to disable chain filtering (removes every reply in the chain)
var chainFiltering = true;

// ================== MEMBERS ================== 

var deletedPostCount = 0;
var removedCountElement;
var threadContainer = document.getElementById("thread-container");
var opPost;
var REMOVED = " mnfrus_filtered";

// ================== FUNCTIONS ==================

function postCreationHandler(mutationRecords) {
  mutationRecords.forEach(function(mutation) {
    for (var post of mutation.addedNodes) {
      removePost(post, null);
    }
  });
}

// Checks if a post needs to be removed and removes it.
// If chainfiltering is on, recurses through replies.
function removePost(post, parent) {
  // Abort if already filtered or not a post
  if (post == null || post.className.includes(REMOVED))
    return
  
  // get Name
  var postName = getPostName(post);
  
  // Go through list of filters, remove and break on match
  for (var filterName of filterList) {
    if (filterName == postName || (chainFiltering && parent != null && parent.className.includes(REMOVED))) {
      if (invisibleDelete) {
        var oldAttr = post.getAttribute("style");
        if (oldAttr == null)
          oldAttr = "";
        post.setAttribute("style", oldAttr + "display: none;");
      } else {
        if (!post.className.includes("deleted"))
          post.className += " deleted";
      }
      
      // Mark as custom filtered class for convenience
      post.className += REMOVED;
      
      // Increase and update filter count
      deletedPostCount++;
      updateRemovedCounter();
      
      // Recurse through replies if chain filtering
      if (chainFiltering) {
        var replies = getReplies(post);
        for (var reply of replies)
          removePost(reply, post);
      }
      
      // No need to check for other
      break;
    }
  }
}

function getPostName(post) {
  // Need to search by class because children of the post seem to differ between observer and manual call
  return post.childNodes[1].getElementsByClassName("name")[0].childNodes[0].innerHTML;
}

function getReplies(post) {
  var backlinks = Array.prototype.slice.call(post.childNodes[post.childNodes.length - 1].getElementsByClassName("post-link"));
  
  // Replace backlink elements with real posts
  for (var i = 0; i < backlinks.length; i++) {
    backlinks[i] = document.getElementById("p" + backlinks[i].getAttribute("data-id"));
  }
  
  return backlinks;
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
opPost = oldPosts.shift(); // Ignore OP
for (var post of oldPosts)
  removePost(post, null);
