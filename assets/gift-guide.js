/**
 * Gift Guide Page — Vanilla JavaScript
 * Handles: custom popup, variant selection (buttons + dropdown),
 * add to cart, conditional cart logic (Black + Medium → auto-add jacket)
 *
 * Product data is read from <script type="application/json"> tags
 * embedded by Liquid — no HTML attribute escaping issues.
 *
 * NO jQuery — vanilla JS only
 */

(function () {
  'use strict';

  /* ========================================================================
     DOM References
     ======================================================================== */

  var overlay = document.getElementById('gift-popup-overlay');
  var popupImage = document.getElementById('popup-image');
  var popupTitle = document.getElementById('popup-title');
  var popupPrice = document.getElementById('popup-price');
  var popupDescription = document.getElementById('popup-description');
  var popupVariants = document.getElementById('popup-variants');
  var addToCartBtn = document.getElementById('popup-add-to-cart');
  var feedback = document.getElementById('popup-feedback');
  var closeBtn = overlay ? overlay.querySelector('.gift-popup__close') : null;

  /* ========================================================================
     State
     ======================================================================== */

  var currentProduct = null;
  var selectedOptions = {};

  /* ========================================================================
     Utilities
     ======================================================================== */

  /** Format price from cents using Shopify's money format if available */
  function formatMoney(cents) {
    if (typeof Shopify !== 'undefined' && typeof Shopify.formatMoney === 'function') {
      return Shopify.formatMoney(cents, Shopify.money_format || '${{amount}}');
    }
    return '$' + (cents / 100).toFixed(2);
  }

  function isSizeOption(name) {
    return name.toLowerCase() === 'size';
  }

  function clearFeedback() {
    if (feedback) {
      feedback.textContent = '';
      feedback.className = 'gift-popup__feedback';
    }
  }

  function showFeedback(message, type) {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = 'gift-popup__feedback gift-popup__feedback--' + type;
  }

  /* ========================================================================
     Variant Matching
     ======================================================================== */

  /** Find the variant that matches all currently selected options */
  function findSelectedVariant() {
    if (!currentProduct || !currentProduct.variants) return null;

    return currentProduct.variants.find(function (variant) {
      return currentProduct.options.every(function (optionName, index) {
        var val = selectedOptions[optionName];
        if (!val) return false;
        return variant.options[index] === val;
      });
    });
  }

  /* ========================================================================
     Popup — opens instantly with data from <script> tags
     ======================================================================== */

  /** Get the best available image for a product */
  function getProductImage(product) {
    if (product.featured_image) return product.featured_image;
    if (product.images && product.images.length > 0) return product.images[0];
    return '';
  }

  /** Open the product popup and populate it with product data */
  function openPopup(product) {
    if (!overlay || !product) return;

    currentProduct = product;
    selectedOptions = {};
    clearFeedback();

    var imgSrc = getProductImage(product);

    if (popupImage) {
      popupImage.src = imgSrc;
      popupImage.alt = product.title || '';
    }

    if (popupTitle) popupTitle.textContent = product.title || '';
    if (popupPrice) popupPrice.textContent = product.price ? formatMoney(product.price) : '';
    if (popupDescription) popupDescription.innerHTML = product.description || '';

    renderVariants(product);

    overlay.classList.add('gift-popup__overlay--active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  /** Close the popup and reset state */
  function closePopup() {
    if (!overlay) return;
    overlay.classList.remove('gift-popup__overlay--active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    currentProduct = null;
    selectedOptions = {};
  }

  /* ========================================================================
     Variant Rendering — buttons for Color, dropdown for Size
     ======================================================================== */

  /** Render variant option selectors (color buttons + size dropdown) */
  function renderVariants(product) {
    if (!popupVariants) return;
    popupVariants.innerHTML = '';

    /* Skip rendering if product has only default "Title" option */
    if (!product.options || (product.options.length === 1 && product.options[0] === 'Title')) {
      return;
    }

    product.options.forEach(function (optionName, optionIndex) {
      /* Collect unique values for this option */
      var values = [];
      product.variants.forEach(function (variant) {
        var val = variant.options[optionIndex];
        if (val && values.indexOf(val) === -1) values.push(val);
      });

      var group = document.createElement('div');
      group.className = 'gift-popup__variant-group';

      var label = document.createElement('span');
      label.className = 'gift-popup__variant-label';
      label.textContent = optionName;
      group.appendChild(label);

      if (isSizeOption(optionName)) {
        renderSizeDropdown(group, optionName, values);
      } else {
        renderColorButtons(group, optionName, values);
      }

      popupVariants.appendChild(group);
    });
  }

  /**
   * Render a custom dropdown for size selection.
   * Uses button + ul/li for full styling control (no native <select>).
   */
  function renderSizeDropdown(group, optionName, values) {
    var selectWrap = document.createElement('div');
    selectWrap.className = 'gift-popup__select-wrapper';

    /* Trigger button — shows selected value */
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'gift-popup__select-trigger';
    trigger.setAttribute('aria-label', optionName);

    var triggerText = document.createElement('span');
    triggerText.className = 'gift-popup__select-trigger-text';
    triggerText.textContent = 'Choose your ' + optionName.toLowerCase();
    trigger.appendChild(triggerText);

    /* SVG chevron icon with border separator */
    var chevron = document.createElement('span');
    chevron.className = 'gift-popup__select-chevron';
    chevron.innerHTML = '<svg width="15" height="9" viewBox="0 0 15 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.06067 1.06067L7.06067 7.06067L13.0607 1.06067" stroke="black" stroke-width="1.5" stroke-linecap="square"/></svg>';
    trigger.appendChild(chevron);

    /* Dropdown list */
    var dropdown = document.createElement('ul');
    dropdown.className = 'gift-popup__select-dropdown';

    values.forEach(function (value) {
      var item = document.createElement('li');
      item.className = 'gift-popup__select-option';
      item.textContent = value;
      item.setAttribute('data-value', value);

      item.addEventListener('click', function () {
        triggerText.textContent = value;
        selectedOptions[optionName] = value;

        /* Update active state */
        dropdown.querySelectorAll('.gift-popup__select-option').forEach(function (o) {
          o.classList.remove('gift-popup__select-option--active');
        });
        item.classList.add('gift-popup__select-option--active');

        /* Close dropdown */
        selectWrap.classList.remove('gift-popup__select-wrapper--open');

        updatePrice();
        clearFeedback();
      });

      dropdown.appendChild(item);
    });

    /* Toggle dropdown open/close */
    trigger.addEventListener('click', function () {
      selectWrap.classList.toggle('gift-popup__select-wrapper--open');
    });

    selectWrap.appendChild(trigger);
    selectWrap.appendChild(dropdown);
    group.appendChild(selectWrap);

    /* Close dropdown when clicking outside (one listener per dropdown) */
    document.addEventListener('click', function (e) {
      if (!selectWrap.contains(e.target)) {
        selectWrap.classList.remove('gift-popup__select-wrapper--open');
      }
    });
  }

  /**
   * Render segmented color buttons with sliding indicator and swatch bars.
   */
  function renderColorButtons(group, optionName, values) {
    var optionsWrap = document.createElement('div');
    optionsWrap.className = 'gift-popup__variant-options';

    /* Sliding active indicator */
    var slider = document.createElement('span');
    slider.className = 'gift-popup__variant-slider';
    optionsWrap.appendChild(slider);

    values.forEach(function (value, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gift-popup__variant-btn';
      btn.style.setProperty('--swatch-color', value.toLowerCase());

      /* Button text inside a span so it sits above the slider */
      var textSpan = document.createElement('span');
      textSpan.className = 'gift-popup__variant-btn-text';
      textSpan.textContent = value;
      btn.appendChild(textSpan);

      btn.addEventListener('click', function () {
        optionsWrap.querySelectorAll('.gift-popup__variant-btn').forEach(function (b) {
          b.classList.remove('gift-popup__variant-btn--active');
        });
        btn.classList.add('gift-popup__variant-btn--active');
        selectedOptions[optionName] = value;

        /* Slide the indicator to this button */
        var count = values.length;
        slider.style.transform = 'translateX(' + (idx * 100) + '%)';
        slider.style.width = (100 / count) + '%';

        updatePrice();
        clearFeedback();
      });

      optionsWrap.appendChild(btn);
    });

    group.appendChild(optionsWrap);
  }

  /** Update displayed price when variant selection changes */
  function updatePrice() {
    var variant = findSelectedVariant();
    if (variant && popupPrice) {
      popupPrice.textContent = formatMoney(variant.price);
    }
  }

  /* ========================================================================
     Add to Cart
     ======================================================================== */

  /** Add a single item to the Shopify cart via the AJAX API */
  function addItemToCart(variantId, quantity) {
    var addUrl = (typeof routes !== 'undefined' && routes.cart_add_url)
      ? routes.cart_add_url
      : '/cart/add.js';

    return fetch(addUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ items: [{ id: variantId, quantity: quantity || 1 }] })
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (body) {
          throw new Error('Cart add failed (' + res.status + '): ' + body);
        });
      }
      return res.json();
    });
  }

  /** Check if selected options match Black + Medium to trigger auto-add */
  function shouldAutoAddJacket() {
    var hasBlack = false;
    var hasMedium = false;

    Object.keys(selectedOptions).forEach(function (name) {
      var val = selectedOptions[name].toLowerCase();
      var n = name.toLowerCase();
      if ((n === 'color' || n === 'colour') && val === 'black') hasBlack = true;
      if (n === 'size' && (val === 'medium' || val === 'm')) hasMedium = true;
    });

    return hasBlack && hasMedium;
  }

  /** Get the first available variant ID of the auto-add jacket product */
  function getJacketVariantId() {
    var script = document.getElementById('soft-winter-jacket-data');
    if (!script) return null;

    try {
      var data = JSON.parse(script.textContent);
      if (!data || !data.variants) return null;
      var available = data.variants.find(function (v) { return v.available; });
      return available ? available.id : data.variants[0].id;
    } catch (e) {
      return null;
    }
  }

  /** Handle the Add to Cart button click inside the popup */
  function handleAddToCart() {
    clearFeedback();

    /* Validate that all options are selected */
    if (currentProduct && currentProduct.options) {
      var allSelected = currentProduct.options.every(function (name) {
        if (name === 'Title') return true;
        return !!selectedOptions[name];
      });
      if (!allSelected) {
        showFeedback('Please select all options', 'error');
        return;
      }
    }

    var variant = findSelectedVariant();
    if (!variant) {
      showFeedback('Selected combination is not available', 'error');
      return;
    }
    if (!variant.available) {
      showFeedback('This variant is sold out', 'error');
      return;
    }

    addToCartBtn.disabled = true;
    addToCartBtn.querySelector('.gift-popup__add-to-cart-text').textContent = 'ADDING...';

    addItemToCart(variant.id, 1)
      .then(function () {
        /* Notify Dawn's cart UI to refresh */
        if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
          publish(PUB_SUB_EVENTS.cartUpdate, {
            source: 'gift-guide',
            productVariantId: variant.id
          });
        }

        /* Conditional logic: auto-add jacket when Black + Medium is selected */
        if (shouldAutoAddJacket()) {
          var jacketId = getJacketVariantId();
          if (jacketId) {
            return addItemToCart(jacketId, 1).then(function () {
              if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
                publish(PUB_SUB_EVENTS.cartUpdate, { source: 'gift-guide-jacket' });
              }
              showFeedback('Added to cart (+ Soft Winter Jacket)', 'success');
            });
          }
        }
        showFeedback('Added to cart!', 'success');
      })
      .catch(function () {
        showFeedback('Could not add to cart. Please try again.', 'error');
      })
      .finally(function () {
        addToCartBtn.disabled = false;
        addToCartBtn.querySelector('.gift-popup__add-to-cart-text').textContent = 'ADD TO CART';
      });
  }

  /* ========================================================================
     Event Listeners
     ======================================================================== */

  /* Plus buttons for multi-variant products → open custom popup */
  var plusButtons = document.querySelectorAll('.gift-grid__plus-btn[data-product-id]');

  plusButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var productId = btn.getAttribute('data-product-id');
      if (!productId) return;

      var script = document.querySelector('script[data-product-data="' + productId + '"]');
      if (!script) return;

      try {
        var product = JSON.parse(script.textContent);
        openPopup(product);
      } catch (e) {
        /* Silently fail if product data cannot be parsed */
      }
    });
  });

  /* Close popup via close button, overlay click, or Escape key */
  if (closeBtn) closeBtn.addEventListener('click', closePopup);

  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closePopup();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closePopup();
  });

  /* Add to cart button inside popup */
  if (addToCartBtn) addToCartBtn.addEventListener('click', handleAddToCart);

})();
