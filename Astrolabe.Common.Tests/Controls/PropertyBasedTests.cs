using Astrolabe.Controls;
using FsCheck.Xunit;
using Xunit;

namespace Astrolabe.Common.Tests.Controls
{
    public class PropertyBasedTests
    {
        #region Array Tests

        /// <summary>
        /// Test that updating array element values changes parent, similar to test in array.test.ts
        /// </summary>
        [Property]
        public void UpdatingArrayElementValuesChangesParent(List<string> stringArray)
        {
            // Skip empty arrays
            if (stringArray.Count == 0)
                return;

            var control = ControlFactory.Create(stringArray);
            var ctx = ControlContext.Create();
            
            // Modify the first element
            var modifiedValue = stringArray[0] + "a";
            ctx.SetValue(control.Elements[0], modifiedValue);
            
            // Verify parent value was updated
            var expected = stringArray.ToList();
            expected[0] = modifiedValue;
            
            var result = (IReadOnlyList<string>)control.Value;
            Assert.Equal(expected.Count, result.Count);
            Assert.Equal(modifiedValue, result[0]);
        }

        /// <summary>
        /// Test that updating array doesn't change value when the value is the same
        /// </summary>
        [Property]
        public void UpdatingArrayWithSameValueDoesNotChangeValue(List<double> numbers)
        {
            var control = ControlFactory.Create(numbers);
            var ctx = ControlContext.Create();
            
            // Track changes
            bool changeDetected = false;
            var subscription = control.Subscribe((ctrl, change) => 
            {
                if ((change & ControlChange.Value) != 0)
                    changeDetected = true;
            }, ControlChange.Value);
            
            // Set the same value
            ctx.SetValue(control, numbers.ToList());
            
            // No change should be detected
            Assert.False(changeDetected);
            Assert.False(control.Dirty);
            
            // Clean up subscription
            control.Unsubscribe(subscription);
        }

        /// <summary>
        /// Test adding element to array similar to addElement test in array.test.ts
        /// </summary>
        [Property]
        public void AddingElementToArray(List<int> numbers, int newValue)
        {
            var control = ControlFactory.Create(numbers);
            var ctx = ControlContext.Create();
            
            // Need to implement an AddElement method
            var newNumbers = numbers.ToList();
            newNumbers.Add(newValue);
            ctx.SetValue(control, newNumbers);
            
            // Verify value was updated
            var result = (IReadOnlyList<int>)control.Value;
            Assert.Equal(numbers.Count + 1, result.Count);
            Assert.Equal(newValue, result[result.Count - 1]);
        }

        #endregion

        #region Error Tests

        /// <summary>
        /// Test setting error makes control invalid similar to errors.test.ts
        /// </summary>
        [Property]
        public void SettingErrorMakesControlInvalid(string value, string errorMessage)
        {
            // Skip empty error messages
            if (string.IsNullOrEmpty(errorMessage))
                return;
                
            var control = ControlFactory.Create(value);
            var ctx = ControlContext.Create();
            
            // Verify initially valid
            Assert.True(control.Valid);
            
            // Track changes
            List<ControlChange> changes = new List<ControlChange>();
            var subscription = control.Subscribe((ctrl, change) => 
            {
                if ((change & ControlChange.Valid) != 0)
                    changes.Add(ControlChange.Valid);
            }, ControlChange.Valid);
            
            // Set error
            ctx.SetError(control, "TestError", errorMessage);
            
            // Verify now invalid
            Assert.False(control.Valid);
            Assert.Equal(errorMessage, control.Error);
            
            // Clear error
            ctx.SetError(control, "TestError", null);
            
            // Verify valid again
            Assert.True(control.Valid);
            Assert.Null(control.Error);
            
            // Verify changes were tracked
            Assert.Equal(2, changes.Count);
            Assert.All(changes, change => Assert.Equal(ControlChange.Valid, change));
            
            // Clean up subscription
            control.Unsubscribe(subscription);
        }

        /// <summary>
        /// Test setting child error makes parent invalid
        /// </summary>
        [Property]
        public void SettingChildErrorMakesParentInvalid(string parentKey, string childValue, string errorMessage)
        {
            // Skip invalid inputs
            if (string.IsNullOrEmpty(parentKey) || string.IsNullOrEmpty(errorMessage))
                return;
                
            var parent = ControlFactory.Create(new Dictionary<string, string> { [parentKey] = childValue });
            var child = parent[parentKey];
            var ctx = ControlContext.Create();
            
            // Track changes
            List<ControlChange> changes = new List<ControlChange>();
            var subscription = parent.Subscribe((ctrl, change) => 
            {
                if ((change & ControlChange.Valid) != 0)
                    changes.Add(ControlChange.Valid);
            }, ControlChange.Valid);
            
            // Set error on child
            ctx.SetError(child, "TestError", errorMessage);
            
            // Verify parent is now invalid
            Assert.False(parent.Valid);
            
            // Clear error
            ctx.SetError(child, "TestError", null);
            
            // Verify parent is valid again
            Assert.True(parent.Valid);
            
            // Verify changes were tracked
            Assert.Equal(2, changes.Count);
            
        }

        /// <summary>
        /// Test error state is cleared by calling clearErrors, similar to errors.test.ts
        /// </summary>
        [Property]
        public void ClearErrorsResetsValidState(string parentKey, string childValue, string errorMessage)
        {
            // Skip invalid inputs
            if (string.IsNullOrEmpty(parentKey) || string.IsNullOrEmpty(errorMessage))
                return;
                
            var parent = ControlFactory.Create(new Dictionary<string, string> { [parentKey] = childValue });
            var child = parent[parentKey];
            var ctx = ControlContext.Create();
            
            // Set error on child
            ctx.SetError(child, "TestError", errorMessage);
            
            // Verify both child and parent are invalid
            Assert.False(child.Valid);
            Assert.False(parent.Valid);
            
            // Clear errors on parent
            ctx.ClearErrors(parent);
            
            // Verify both parent and child are now valid
            Assert.True(child.Valid);
            Assert.True(parent.Valid);
        }

        #endregion

        #region Object Tests

        /// <summary>
        /// Test updating object doesn't change value when the value is the same
        /// </summary>
        [Property]
        public void UpdatingObjectWithSameValueDoesNotChangeValue(string key, string value)
        {
            if (string.IsNullOrEmpty(key))
                return;

            var obj = new Dictionary<string, string> { [key] = value };
            var control = ControlFactory.Create(obj);
            var ctx = ControlContext.Create();
            
            // Track changes
            bool changeDetected = false;
            var subscription = control.Subscribe((ctrl, change) => 
            {
                if ((change & ControlChange.Value) != 0)
                    changeDetected = true;
            }, ControlChange.Value);
            
            // Set the same value
            ctx.SetValue(control, new Dictionary<string, string> { [key] = value });
            
            // No change should be detected
            Assert.False(changeDetected);
            Assert.False(control.Dirty);
            
            // Clean up subscription
            control.Unsubscribe(subscription);
        }

        /// <summary>
        /// Test updating object child changes parent similar to object.test.ts
        /// </summary>
        [Property]
        public void UpdatingObjectChildChangesParent(string key, string value)
        {
            if (string.IsNullOrEmpty(key))
                return;

            var obj = new Dictionary<string, string> { [key] = value };
            var control = ControlFactory.Create(obj);
            var ctx = ControlContext.Create();
            
            // Track changes
            List<ControlChange> changes = new List<ControlChange>();
            var subscription = control.Subscribe((ctrl, change) => 
            {
                if ((change & ControlChange.Value) != 0)
                    changes.Add(ControlChange.Value);
            }, ControlChange.Value);
            
            // Modify child
            var modifiedValue = value + "a";
            ctx.SetValue(control[key], modifiedValue);
            
            // Verify parent value was updated
            var result = (IDictionary<string, string>)control.Value;
            Assert.Equal(modifiedValue, result[key]);
            
            // Verify changes were tracked
            Assert.Single(changes);
            Assert.Equal(ControlChange.Value, changes[0]);
            
            // Verify control is dirty
            Assert.True(control.Dirty);
            
            // Clean up subscription
            control.Unsubscribe(subscription);
        }

        /// <summary>
        /// Test updating object parent changes child similar to object.test.ts
        /// </summary>
        [Property]
        public void UpdatingObjectParentChangesChild(string key, string value)
        {
            if (string.IsNullOrEmpty(key))
                return;

            var obj = new Dictionary<string, string> { [key] = value };
            var control = ControlFactory.Create(obj);
            var child = control[key];
            var ctx = ControlContext.Create();
            
            // Initial state
            Assert.Equal(value, child.Value);
            
            // Modify parent
            var modifiedValue = value + "a";
            ctx.SetValue(control, new Dictionary<string, string> { [key] = modifiedValue });
            
            // Verify child value was updated
            Assert.Equal(modifiedValue, child.Value);
        }
        
        /// <summary>
        /// Test that updating object back to original value results in not dirty state
        /// </summary>
        [Property]
        public void UpdatingObjectBackToOriginalIsNotDirty(string key, string value1, string value2)
        {
            if (string.IsNullOrEmpty(key) || value1 == value2)
                return;

            var obj = new Dictionary<string, string> { [key] = value1 };
            var control = ControlFactory.Create(obj);
            var ctx = ControlContext.Create();
            
            // Track changes
            List<ControlChange> changes = new List<ControlChange>();
            var subscription = control.Subscribe((ctrl, change) => 
            {
                if ((change & (ControlChange.Value | ControlChange.Dirty)) != 0)
                    changes.Add(change);
            }, ControlChange.Value | ControlChange.Dirty);
            
            // Modify value
            ctx.SetValue(control[key], value2);
            
            // Should be dirty
            Assert.True(control.Dirty);
            
            // Set back to original
            ctx.SetValue(control[key], value1);
            
            // Should not be dirty
            Assert.False(control.Dirty);
            
            // Verify changes were tracked
            Assert.Equal(2, changes.Count);
            
            // Clean up subscription
            control.Unsubscribe(subscription);
        }

        #endregion

        #region General Tests

        /// <summary>
        /// Test dirty flag for value changes similar to general.test.ts
        /// </summary>
        [Property]
        public void DirtyFlagForValueChanges(string text)
        {
            var control = ControlFactory.Create(text);
            var ctx = ControlContext.Create();
            
            // Track changes
            List<ControlChange> changes = new List<ControlChange>();
            var subscription = control.Subscribe((ctrl, change) => 
            {
                if ((change & ControlChange.Value) != 0)
                    changes.Add(ControlChange.Value);
            }, ControlChange.Value);
            
            // Modify value
            var modifiedValue = text + "a";
            ctx.SetValue(control, modifiedValue);
            
            // Verify control is dirty
            Assert.True(control.Dirty);
            
            // Verify changes were tracked
            Assert.Single(changes);
            Assert.Equal(ControlChange.Value, changes[0]);
            
            // Clean up subscription
            control.Unsubscribe(subscription);
        }

        /// <summary>
        /// Test only get changes after subscription similar to general.test.ts
        /// </summary>
        [Property]
        public void OnlyGetChangesAfterSubscription(string text)
        {
            var control = ControlFactory.Create(text);
            var ctx = ControlContext.Create();
            
            // Modify value before subscription
            var modifiedValue1 = text + "a";
            ctx.SetValue(control, modifiedValue1);
            
            // Track changes
            List<ControlChange> changes = new List<ControlChange>();
            var subscription = control.Subscribe((ctrl, change) => 
            {
                if ((change & ControlChange.Value) != 0)
                    changes.Add(ControlChange.Value);
            }, ControlChange.Value);
            
            // Modify value after subscription
            var modifiedValue2 = text + "b";
            ctx.SetValue(control, modifiedValue2);
            
            // Verify only changes after subscription were tracked
            Assert.Single(changes);
            Assert.Equal(ControlChange.Value, changes[0]);
            
            // Clean up subscription
            control.Unsubscribe(subscription);
        }

        /// <summary>
        /// Test don't get changes after unsubscribe similar to general.test.ts
        /// </summary>
        [Property]
        public void DontGetChangesAfterUnsubscribe(string text)
        {
            var control = ControlFactory.Create(text);
            var ctx = ControlContext.Create();
            
            // Track changes
            List<ControlChange> changes = new List<ControlChange>();
            var subscription = control.Subscribe((ctrl, change) => 
            {
                if ((change & ControlChange.Value) != 0)
                    changes.Add(ControlChange.Value);
            }, ControlChange.Value);
            
            // Modify value
            var modifiedValue1 = text + "a";
            ctx.SetValue(control, modifiedValue1);
            
            // Unsubscribe
            control.Unsubscribe(subscription);
            
            // Modify value again
            var modifiedValue2 = text + "b";
            ctx.SetValue(control, modifiedValue2);
            
            // Verify only changes before unsubscribe were tracked
            Assert.Single(changes);
            Assert.Equal(ControlChange.Value, changes[0]);
        }

        #endregion
    }
}