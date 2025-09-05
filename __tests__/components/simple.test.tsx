import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

// Simple Button component for testing
const SimpleButton = ({ onPress, title, disabled = false }) => (
  <TouchableOpacity 
    onPress={onPress} 
    disabled={disabled}
    testID="simple-button"
  >
    <Text testID="button-text">{title}</Text>
  </TouchableOpacity>
);

// Simple Card component for testing
const SimpleCard = ({ title, description, count = 0 }) => (
  <View testID="simple-card">
    <Text testID="card-title">{title}</Text>
    <Text testID="card-description">{description}</Text>
    <Text testID="card-count">{count}</Text>
  </View>
);

describe('Simple Component Tests', () => {
  describe('SimpleButton', () => {
    it('should render button with title', () => {
      const { getByText } = render(
        <SimpleButton title="Click me" onPress={() => {}} />
      );
      
      expect(getByText('Click me')).toBeTruthy();
    });

    it('should call onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <SimpleButton title="Click me" onPress={onPress} />
      );
      
      const button = getByTestId('simple-button');
      fireEvent.press(button);
      
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when disabled', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <SimpleButton title="Click me" onPress={onPress} disabled={true} />
      );
      
      const button = getByTestId('simple-button');
      fireEvent.press(button);
      
      expect(onPress).not.toHaveBeenCalled();
    });

    it('should render different titles', () => {
      const { getByText, rerender } = render(
        <SimpleButton title="First" onPress={() => {}} />
      );
      
      expect(getByText('First')).toBeTruthy();
      
      rerender(<SimpleButton title="Second" onPress={() => {}} />);
      
      expect(getByText('Second')).toBeTruthy();
    });
  });

  describe('SimpleCard', () => {
    it('should render card with all props', () => {
      const { getByText } = render(
        <SimpleCard 
          title="Test Title" 
          description="Test Description" 
          count={42} 
        />
      );
      
      expect(getByText('Test Title')).toBeTruthy();
      expect(getByText('Test Description')).toBeTruthy();
      expect(getByText('42')).toBeTruthy();
    });

    it('should render with default count', () => {
      const { getByText } = render(
        <SimpleCard 
          title="Title" 
          description="Description" 
        />
      );
      
      expect(getByText('0')).toBeTruthy();
    });

    it('should update when props change', () => {
      const { getByText, rerender } = render(
        <SimpleCard 
          title="Title 1" 
          description="Desc 1" 
          count={1} 
        />
      );
      
      expect(getByText('Title 1')).toBeTruthy();
      expect(getByText('1')).toBeTruthy();
      
      rerender(
        <SimpleCard 
          title="Title 2" 
          description="Desc 2" 
          count={2} 
        />
      );
      
      expect(getByText('Title 2')).toBeTruthy();
      expect(getByText('2')).toBeTruthy();
    });

    it('should have correct testIDs', () => {
      const { getByTestId } = render(
        <SimpleCard 
          title="Title" 
          description="Description" 
          count={5} 
        />
      );
      
      expect(getByTestId('simple-card')).toBeTruthy();
      expect(getByTestId('card-title')).toBeTruthy();
      expect(getByTestId('card-description')).toBeTruthy();
      expect(getByTestId('card-count')).toBeTruthy();
    });
  });
});