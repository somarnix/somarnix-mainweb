# 🧪 ការណែនាំធ្វើតេស្ត (Test Instructions)

## ✅ ការកែប្រែថ្មី - Auto Enter Submit

Extension ឥឡូវនេះនឹង **auto press Enter key** បន្ទាប់ពីសរសេរ prompt រួច!

### 📝 របៀបដែល Auto Submit ដំណើរការ:

1. **ជំហានទី 1:** សរសេរ prompt ចូលក្នុង input field
2. **ជំហានទី 2:** រង់ចាំ UI update (0.8 វិនាទី)
3. **ជំហានទី 3:** ពិនិត្យថា input នៅក្នុង `<form>` ឬអត់
   - ប្រសិនមាន form → trigger `form.submit()` និង `form.requestSubmit()`
4. **ជំហានទី 4:** Press Enter key (KeyDown → KeyPress → KeyUp)
5. **ជំហានទី 5:** រង់ចាំ 1.5 វិនាទី ហើយពិនិត្យថា generation បានចាប់ផ្តើមឬអត់
6. **ជំហានទី 6 (Backup):** ប្រសិនបរាជ័យ → ស្វែងរកនិងចុច button

### 🎯 វិធីសាស្ត្រ Submit (តាមលំដាប់អាទិភាព):

#### Priority 1: Form Submit
```javascript
parentForm.submit()
parentForm.requestSubmit()
```

#### Priority 2: Enter Key Press
```javascript
KeyDown(Enter) → KeyPress(Enter) → KeyUp(Enter)
```

#### Priority 3: Button Click (Backup)
- ស្វែងរក submit button
- ចុច button ដោយប្រើ 5 វិធី

### 🔍 ការពិនិត្យថា Submit ជោគជ័យ

Extension នឹងពិនិត្យរក loading indicators:
- `[role="progressbar"]`
- `.loading`, `.spinner`
- `[aria-busy="true"]`
- `button[disabled]`
- `.progress`

ប្រសិនរកឃើញ → Submit ជោគជ័យ! ✅  
ប្រសិនមិនរក → ព្យាយាមចុច button ជំនួស

---

## 🧪 របៀបធ្វើតេស្ត:

### ជំហានទី 1: Reload Extension

```
1. ទៅ chrome://extensions/
2. រក "Google Flow Auto Video Generator"
3. ចុចលើ reload icon (🔄)
```

### ជំហានទី 2: បើក Console (សំខាន់!)

```
1. ទៅកាន់ https://labs.google/fx/tools/flow/project
2. ចុច F12 ដើម្បីបើក Developer Tools
3. ចុច tab "Console"
```

### ជំហានទី 3: ប្រើ Extension

```
1. ចុច Extension icon លើ toolbar
2. បញ្ចូល prompt: "A cat playing piano"
3. ចុច "▶️ Start Auto Generate"
4. មើល Console logs!
```

---

## 📊 Console Logs ដែលអ្នកគួរឃើញ:

### ✅ Success Case (Enter Key Works):

```
🎬 Starting video generation with prompt: A cat playing piano
⏳ Waiting for prompt input field...
✅ Found prompt input, typing text...
⏳ Waiting for UI to update after typing...
📋 Found parent form, attempting form submit...
⌨️ Pressing Enter key to submit...
✅ Form.requestSubmit() called
✅ Enter key pressed!
🔍 Checking if Enter key submission worked...
✅ Generation started via Enter key!
✅ Enter key submission successful, skipping button click!
✅ Video generation started!
```

### ⚠️ Fallback Case (Enter Key Fails, Button Works):

```
🎬 Starting video generation with prompt: A cat playing piano
⏳ Waiting for prompt input field...
✅ Found prompt input, typing text...
⏳ Waiting for UI to update after typing...
⌨️ Pressing Enter key to submit...
✅ Enter key pressed!
🔍 Checking if Enter key submission worked...
⚠️ Enter key might not have worked, trying button click as backup...
🔍 Looking for Generate/Submit button...
✅ Found button with selector: button[type="submit"]
🎯 Found button! Text: Generate
🖱️ Clicking generate button...
✅ Button clicked successfully!
✅ Video generation started!
```

---

## 🐛 Troubleshooting

### បញ្ហា: Enter key មិនដំណើរការ

**ត្រូវពិនិត្យ:**
1. Input field នៅក្នុង `<form>` ឬអត់?
2. Google Flow ប្រើ custom event handlers ឬអត់?
3. មាន JavaScript errors ក្នុង console ឬអត់?

**ដំណោះស្រាយ:**
- Extension នឹង auto fallback ទៅ button click
- ពិនិត្យ console logs ដើម្បីឃើញអ្វីកើតឡើង

### បញ្ហា: Button click ក៏មិនដំណើរការដែរ

**ត្រូវពិនិត្យ:**
1. មើល console logs "Available buttons on page:"
2. ពិនិត្យ button names និង states
3. Button disabled ឬលាក់ឬអត់?

**ដំណោះស្រាយ:**
- រង់ចាំទំព័រ load ចប់
- Refresh page ហើយព្យាយាមម្តងទៀត
- ពិនិត្យ Network requests (F12 → Network tab)

---

## 💡 Tips សំរាប់ Testing

### ✅ ធ្វើអ្វី:
- ✓ បើក Console ជានិច្ច
- ✓ អាន logs យ៉ាងយកចិត្តទុកដាក់
- ✓ ពិនិត្យ Network tab (F12 → Network)
- ✓ Test លើ different projects
- ✓ Test ជាមួយ prompts ខុសៗគ្នា

### ❌ មិនគួរធ្វើ:
- ✗ បិទ console (អ្នកនឹងមិនឃើញអ្វីកើតឡើងទេ)
- ✗ ចុច Start ច្រើនដងក្នុងពេលតែមួយ
- ✗ បិទ tab មុនពេល generation ចាប់ផ្តើម

---

## 📈 Expected Results

### ករណី 1: Form Submit Success (70% គួរតែដំណើរការ)
- Enter key triggers form submit
- Generation starts immediately
- No button click needed

### ករណី 2: Enter Key Success (20% គួរតែដំណើរការ)
- Enter key triggers generation
- No form but enter works
- No button click needed

### ករណី 3: Button Click Fallback (10% គួរតែដំណើរការ)
- Enter key fails
- Extension finds and clicks button
- Generation starts

---

## 🎓 Advanced Testing

### Test Form Detection:
```javascript
// Run in console on Google Flow page:
const textarea = document.querySelector('textarea');
const form = textarea?.closest('form');
console.log('Form found:', form);
console.log('Form action:', form?.action);
console.log('Form method:', form?.method);
```

### Test Button Detection:
```javascript
// Run in console:
const buttons = document.querySelectorAll('button');
buttons.forEach((btn, i) => {
  console.log(`${i}: ${btn.textContent.trim()} - Type: ${btn.type}, Disabled: ${btn.disabled}`);
});
```

### Test Enter Key Manually:
```javascript
// Run in console:
const textarea = document.querySelector('textarea');
textarea.focus();
textarea.dispatchEvent(new KeyboardEvent('keydown', { 
  key: 'Enter', 
  keyCode: 13, 
  bubbles: true 
}));
```

---

## ✅ Testing Checklist

- [ ] Extension reloaded
- [ ] Console opened (F12)
- [ ] Google Flow page loaded
- [ ] Prompt entered
- [ ] Start button clicked
- [ ] Console logs checked
- [ ] Generation started successfully
- [ ] No errors in console

---

**សូមរីករាយក្នុងការធ្វើតេស្ត! Happy Testing! 🚀**

ប្រសិនមានបញ្ហា សូមមើល console logs ហើយប្រាប់ខ្ញុំនូវ:
1. Console logs (copy/paste)
2. Button names លើទំព័រ
3. ការ generation ចាប់ផ្តើមឬអត់
