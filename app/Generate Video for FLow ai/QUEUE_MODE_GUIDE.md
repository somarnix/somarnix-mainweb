# 🔄 Multiple Prompts Queue Mode

## ការណែនាំ (Overview)

Extension Google Flow ឥឡូវអាចធ្វើការ generate videos ច្រើនតាមលំដាប់! អ្នកដាក់ prompts ច្រើនបន្ទាត់ ហើយ extension នឹង auto generate ម្តងមួយៗតាមលំដាប់។

## ✨ Features

- ✅ **Queue Processing**: Generate videos ច្រើនតាមលំដាប់
- ✅ **Progress Tracking**: ឃើញការដំណើរការ real-time
- ✅ **Configurable Delay**: កំណត់ពេលរង់ចាំរវាងការ generate
- ✅ **Error Handling**: បន្តដំណើរការទោះបីមួយបរាជ័យ
- ✅ **Summary Report**: របាយការណ៍ពេលរួចរាល់

## 📝 របៀបប្រើប្រាស់ (How to Use)

### ជំហានទី 1: ជ្រើសរើស Mode

1. បើក Extension popup
2. ឃើញ **"Prompt Mode:"**
3. ជ្រើសរើស:
   - **Single Prompt**: សម្រាប់ generate តែមួយ
   - **Multiple Prompts (Queue)**: សម្រាប់ generate ច្រើន ✓

### ជំហានទី 2: បញ្ចូល Prompts

បញ្ចូល prompts **មួយបន្ទាត់មួយ** (one prompt per line):

```
A cat playing piano in space
A dog dancing on the moon
A bird singing in the ocean
Beautiful sunset over mountains
City skyline at night with stars
```

**កំណត់ចំណាំ:**
- មួយ prompt មួយបន្ទាត់
- បន្ទាត់ទទេនឹងត្រូវរំលង
- Extension នឹងបង្ហាញចំនួន prompts ដែលរកឃើញ

### ជំហានទី 3: កំណត់ Delay (Optional)

ក្នុង **Settings**:
- ពង្រីក "⚙️ Settings"
- ឃើញ **"Delay between prompts"**
- កំណត់ពេលរង់ចាំ (5-300 វិនាទី)
- លំនាំដើម: 10 វិនាទី

**ហេតុអ្វីត្រូវការ delay?**
- ឱ្យ Google Flow មានពេលបញ្ចប់ការ generate
- ជៀសវាងការ spam requests
- ការពារពីការ rate limiting

### ជំហានទី 4: ចាប់ផ្តើម Queue

1. ពិនិត្យ prompts ម្តងទៀត
2. ចុច **"▶️ Start Auto Generate"**
3. នឹងបង្ហាញ confirmation dialog:
   ```
   ⚡ Queue Mode
   
   Ready to generate 5 video(s) in sequence:
   
   1. A cat playing piano in space
   2. A dog dancing on the moon
   3. A bird singing in the ocean
   4. Beautiful sunset over mountains
   5. City skyline at night with stars
   
   Delay between: 10s
   
   This may take a while. Continue?
   ```
4. ចុច **OK** ដើម្បីចាប់ផ្តើម

### ជំហានទី 5: តាមដានការដំណើរការ

Extension នឹងបង្ហាញ:
- **Button text**: "Processing (2/5)..."
- **Status**: "📊 Queue: 2/5 - Processing: 'A dog dancing...'"
- **Console logs**: ព័ត៌មានលម្អិត

## 🎯 ឧទាហរណ៍ Usage Examples

### Example 1: Travel Video Series
```
Beautiful beach sunset in Maldives
Snowy mountain peaks in Switzerland
Ancient temples in Cambodia
Northern lights in Iceland
Safari in African savanna
```

### Example 2: Animal Series
```
Cute puppy playing with ball
Kitten sleeping peacefully
Bird building a nest
Dolphin jumping in ocean
Elephant family walking
```

### Example 3: Nature Scenes
```
Waterfall in rainforest
Desert sand dunes at sunset
Cherry blossoms in spring
Autumn leaves falling
Winter wonderland scene
```

## 📊 Queue Processing Flow

```
1. Prompt 1: "A cat playing piano"
   ├─ Type prompt
   ├─ Press Enter / Click button
   ├─ Wait for generation to start
   └─ ✅ Success!

2. ⏳ Wait 10 seconds...

3. Prompt 2: "A dog dancing"
   ├─ Type prompt
   ├─ Press Enter / Click button
   ├─ Wait for generation to start
   └─ ✅ Success!

4. ⏳ Wait 10 seconds...

... (continues for all prompts)

✅ Queue Complete!
   - 5/5 successful
   - 0 failed
```

## 🔍 Console Output Example

```
🎬 Starting queue processing: 5 prompts
⏱️ Delay between prompts: 10000ms

==================================================
📋 Queue Progress: 1/5
📝 Prompt: "A cat playing piano in space"
==================================================

🎬 Starting video generation with prompt: A cat playing piano in space
⏳ Waiting for prompt input field...
✅ Found prompt input, typing text...
⏳ Waiting for UI to update after typing...
⌨️ Pressing Enter key to submit...
✅ Enter key pressed!
✅ Generation started via Enter key!
✅ [1/5] Success: "A cat playing piano in space"
⏳ Waiting 10s before next prompt...

==================================================
📋 Queue Progress: 2/5
📝 Prompt: "A dog dancing on the moon"
==================================================
...

==================================================
🎉 Queue Complete!
✅ Success: 5/5
❌ Failed: 0/5
==================================================
```

## ⚙️ Settings สำหรับ Queue Mode

### Delay Between Prompts
- **Min**: 5 วិនាទី
- **Max**: 300 វិនាទី (5 នាទី)
- **Recommended**: 10-30 វិនាទី
- **Purpose**: ឱ្យ Google Flow មានពេលដំណើរការ

### Auto Retry
- ✅ **Enabled**: ព្យាយាមម្តងទៀតប្រសិនបរាជ័យ
- ❌ **Disabled**: រំលងទៅ prompt បន្ទាប់ភ្លាម

### Notify When Complete
- ✅ **Enabled**: ជូនដំណឹងពេល queue រួចរាល់
- ❌ **Disabled**: គ្មានជូនដំណឹង

## 🐛 Troubleshooting

### បញ្ហា: Queue ឈប់កណ្តាល

**Cause**: Browser tab closed or navigation
**Solution**: 
- កុំបិទ Google Flow tab
- កុំ navigate ទៅទំព័រផ្សេង
- រង់ចាំឱ្យ queue រួចរាល់

### បញ្ហា: មួយបរាជ័យ queue ឈប់

**Cause**: Auto retry disabled
**Solution**:
- បើក "Auto retry on error" ក្នុង settings
- Retry នឹងព្យាយាមរហូតដល់ 3 ដង
- ប្រសិននៅតែបរាជ័យ queue នឹងបន្ត

### បញ្ហា: Generation ល្អឿននិងញឹកញាប់ពេក

**Cause**: Delay too short
**Solution**:
- បង្កើន "Delay between prompts"
- Recommended: យ៉ាងហោចណាស់ 10 វិនាទី
- សម្រាប់ prompts ស្មុគស្មាញ: 20-30 វិនាទី

### បញ្ហា: Google Flow rate limiting

**Cause**: Too many requests too fast
**Solution**:
- បង្កើន delay ទៅ 30+ វិនាទី
- កាត់បន្ថយចំនួន prompts ក្នុងមួយ queue
- ប្រើ queue តូចៗ (5-10 prompts)

## 💡 Best Practices

### ✅ ធ្វើអ្វី (Do):

1. **Test Single First**: ធ្វើតេស្ត single prompt មុន
2. **Use Reasonable Delays**: 10-30 វិនាទីគឺល្អ
3. **Keep Tab Open**: កុំបិទ tab ក្នុងពេល processing
4. **Monitor Progress**: មើល console logs
5. **Small Batches**: ចាប់ផ្តើមជាមួយ 3-5 prompts
6. **Clear Prompts**: ប្រើ prompts ច្បាស់លាស់

### ❌ មិនគួរធ្វើ (Don't):

1. **Close Tab**: កុំបិទ Google Flow tab
2. **Navigate Away**: កុំទៅទំព័រផ្សេង
3. **Too Short Delay**: < 5 វិនាទីអាចមានបញ្ហា
4. **Too Many Prompts**: > 20 prompts អាចយូរពេក
5. **Refresh Page**: កុំ refresh ក្នុងពេល processing
6. **Multiple Queues**: កុំចាប់ផ្តើម queue ច្រើនក្នុងពេលតែមួយ

## 📈 Performance

### ពេលវេលាដែលរំពឹង (Expected Timing):

```
1 prompt  = ~2 minutes (processing time)
5 prompts = ~15 minutes (with 10s delay)
10 prompts = ~30 minutes (with 10s delay)
```

**រូបមន្ត:**
```
Total Time = (Number of Prompts × Processing Time) + 
             ((Number of Prompts - 1) × Delay)
```

**ឧទាហរណ៍:**
```
5 prompts × 2 min + (4 × 10s) = ~10min 40s
```

## 🎉 Success Indicators

### អ្វីដែលបង្ហាញ Success:

- ✅ Console: "✅ [1/5] Success: ..."
- ✅ Status: "✅ Completed: ..."
- ✅ Progress: "Processing (2/5)..."
- ✅ Final: "🎉 Queue complete! ✅ 5 success"

### អ្វីដែលបង្ហាញ Error:

- ❌ Console: "❌ [1/5] Failed: ..."
- ❌ Status: "❌ Failed: ..."
- ⚠️ Final: "Queue complete! ✅ 3 success, ❌ 2 failed"

## 📋 Checklist Before Starting Queue

- [ ] Extension reloaded
- [ ] Multiple Prompts mode selected
- [ ] All prompts entered (one per line)
- [ ] Prompt count shows correct number
- [ ] Delay configured (10-30s recommended)
- [ ] Auto retry enabled
- [ ] Google Flow tab ready
- [ ] Console open (F12) for monitoring
- [ ] Have time to wait (don't close tab)

---

## 🚀 Quick Start Example

1. **Select Mode**: Multiple Prompts (Queue) ✓
2. **Enter Prompts**:
   ```
   Cat playing piano
   Dog dancing
   Bird singing
   ```
3. **Set Delay**: 10 seconds
4. **Click Start**: ចុច "▶️ Start Auto Generate"
5. **Confirm**: ចុច OK ក្នុង dialog
6. **Wait**: មើល progress ហើយរង់ចាំ
7. **Done**: ទទួល notification ពេលរួចរាល់! 🎉

---

**សូមរីករាយក្នុងការ generate videos ច្រើនៗ! Happy generating! 🎬✨**
