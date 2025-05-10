import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Heading1,
  Heading2,
  Heading3,
  BodyText,
  SmallText,
  Button,
  Card,
  Input,
  FeedbackBadge,
  Icon,
  Tabs,
  CourseCard,
  Checkbox,
  FilterChip,
  SearchFilters,
  FilterSection,
} from '../';
import { useEdenTheme } from '../../../theme';

/**
 * Example usage of Eden design system components
 * This component demonstrates how to use the Eden design system components.
 */
export const ExampleUsage: React.FC = () => {
  const theme = useEdenTheme();
  const [inputValue, setInputValue] = useState('');
  const [tabIndex, setTabIndex] = useState(0);
  const [checkbox1, setCheckbox1] = useState(false);
  const [checkbox2, setCheckbox2] = useState(true);
  
  // Example course data
  const exampleCourse = {
    id: '1',
    name: 'Augusta National Golf Club',
    location: 'Augusta, Georgia',
    average_rating: 4.9,
    total_reviews: 256,
    distance: 3.2,
  };
  
  // Example filter sections
  const [difficultyFilters, setDifficultyFilters] = useState<number[]>([]);
  const toggleDifficulty = (value: number) => {
    if (difficultyFilters.includes(value)) {
      setDifficultyFilters(difficultyFilters.filter(v => v !== value));
    } else {
      setDifficultyFilters([...difficultyFilters, value]);
    }
  };
  
  const [priceFilters, setPriceFilters] = useState<string[]>([]);
  const togglePrice = (value: string) => {
    if (priceFilters.includes(value)) {
      setPriceFilters(priceFilters.filter(v => v !== value));
    } else {
      setPriceFilters([...priceFilters, value]);
    }
  };
  
  // Example filter sections
  const filterSections: FilterSection[] = [
    {
      key: 'difficulty',
      title: 'Difficulty',
      options: [
        { label: 'Beginner', value: 1 },
        { label: 'Intermediate', value: 2 },
        { label: 'Advanced', value: 3 },
        { label: 'Expert', value: 4 },
      ],
      values: difficultyFilters,
      onToggle: toggleDifficulty,
    },
    {
      key: 'price',
      title: 'Price Range',
      options: [
        { label: '$', value: '$' },
        { label: '$$', value: '$$' },
        { label: '$$$', value: '$$$' },
        { label: '$$$$', value: '$$$$' },
      ],
      values: priceFilters,
      onToggle: togglePrice,
    },
  ];
  
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Typography Examples */}
      <Card variant="default" style={styles.section}>
        <Heading2>Typography</Heading2>
        
        <View style={styles.exampleRow}>
          <Heading1>Heading 1</Heading1>
          <Heading2>Heading 2</Heading2>
          <Heading3>Heading 3</Heading3>
          <BodyText>Body Text - Regular paragraph text</BodyText>
          <SmallText>Small Text - Used for less important content</SmallText>
        </View>
      </Card>
      
      {/* Button Examples */}
      <Card variant="default" style={styles.section}>
        <Heading2>Buttons</Heading2>
        
        <View style={styles.exampleRow}>
          <Button label="Primary Button" variant="primary" style={styles.buttonSpacing} />
          <Button label="Secondary Button" variant="secondary" style={styles.buttonSpacing} />
          <Button label="Tertiary Button" variant="tertiary" style={styles.buttonSpacing} />
          <Button label="Success Button" variant="success" style={styles.buttonSpacing} />
          <Button label="Destructive Button" variant="destructive" style={styles.buttonSpacing} />
          <Button
            label="With Icon"
            variant="primary"
            startIcon={<Icon name="Heart" size="inline" color="white" />}
            style={styles.buttonSpacing}
          />
          <Button label="Disabled Button" variant="primary" disabled style={styles.buttonSpacing} />
          <Button label="Loading Button" variant="primary" loading style={styles.buttonSpacing} />
        </View>
      </Card>
      
      {/* Input Examples */}
      <Card variant="default" style={styles.section}>
        <Heading2>Inputs</Heading2>
        
        <View style={styles.exampleRow}>
          <Input
            label="Standard Input"
            placeholder="Type something..."
            value={inputValue}
            onChangeText={setInputValue}
          />
          
          <Input
            label="With Helper Text"
            placeholder="Type something..."
            helperText="This is some helper text"
          />
          
          <Input
            label="With Error"
            placeholder="Type something..."
            error="This field is required"
          />
          
          <Input
            label="With Icon"
            placeholder="Search..."
            startIcon={<Icon name="Search" size="inline" color={theme.colors.text.secondary} />}
          />
          
          <Input
            label="Disabled Input"
            placeholder="You can't edit this"
            disabled
          />
        </View>
      </Card>
      
      {/* Form Element Examples */}
      <Card variant="default" style={styles.section}>
        <Heading2>Form Elements</Heading2>
        
        <View style={styles.exampleRow}>
          <Heading3>Checkboxes</Heading3>
          <Checkbox
            checked={checkbox1}
            onToggle={() => setCheckbox1(!checkbox1)}
            label="Unchecked checkbox"
            helperText="Click to toggle"
          />
          
          <Checkbox
            checked={checkbox2}
            onToggle={() => setCheckbox2(!checkbox2)}
            label="Checked checkbox"
            helperText="With helper text"
          />
          
          <Checkbox
            checked={true}
            onToggle={() => {}}
            label="Disabled checkbox"
            disabled
          />
        </View>
        
        <View style={[styles.exampleRow, { marginTop: 24 }]}>
          <Heading3>Filter Chips</Heading3>
          <View style={styles.filterChipRow}>
            <FilterChip
              label="Not Selected"
              selected={false}
              onToggle={() => {}}
            />
            
            <FilterChip
              label="Selected"
              selected={true}
              onToggle={() => {}}
            />
            
            <FilterChip
              label="With Icon"
              selected={true}
              icon="Filter"
              onToggle={() => {}}
            />
            
            <FilterChip
              label="Disabled"
              selected={false}
              disabled
              onToggle={() => {}}
            />
          </View>
        </View>
        
        <View style={[styles.exampleRow, { marginTop: 24 }]}>
          <Heading3>Search Filters</Heading3>
          <SearchFilters
            title="Filter Options"
            description="Select filters to narrow results"
            sections={filterSections}
          />
        </View>
      </Card>
      
      {/* Feedback Badge Examples */}
      <Card variant="default" style={styles.section}>
        <Heading2>Feedback Badges</Heading2>
        
        <View style={styles.badgeExamples}>
          <FeedbackBadge
            status="positive"
            icon={<Icon name="ThumbsUp" size="inline" color={theme.colors.text.primary} />}
          />
          
          <FeedbackBadge
            status="neutral"
            icon={<Icon name="Minus" size="inline" color={theme.colors.text.primary} />}
          />
          
          <FeedbackBadge
            status="negative"
            icon={<Icon name="ThumbsDown" size="inline" color={theme.colors.text.primary} />}
          />
        </View>
        
        <View style={styles.badgeExamples}>
          <FeedbackBadge status="positive" small />
          <FeedbackBadge status="neutral" small />
          <FeedbackBadge status="negative" small />
        </View>
      </Card>
      
      {/* Card Examples */}
      <Card variant="default" style={styles.section}>
        <Heading2>Cards</Heading2>
        
        <View style={styles.exampleRow}>
          <Card variant="course" style={styles.cardExample}>
            <Heading3>Course Card</Heading3>
            <BodyText>Standard card used for course listings</BodyText>
          </Card>
          
          <Card variant="listItem" style={styles.cardExample}>
            <Heading3>List Item Card</Heading3>
            <SmallText>Compact card for list items</SmallText>
          </Card>
          
          <Card variant="profile" style={styles.cardExample}>
            <Heading3>Profile Card</Heading3>
            <BodyText>Card used for profile information</BodyText>
          </Card>
        </View>
      </Card>
      
      {/* Course Card Example */}
      <Card variant="default" style={styles.section}>
        <Heading2>Course Card</Heading2>
        
        <View style={styles.exampleRow}>
          <CourseCard course={exampleCourse} />
          <CourseCard loading />
          <CourseCard error="Could not load course" onRetry={() => {}} />
        </View>
      </Card>
      
      {/* Tabs Example */}
      <Card variant="default" style={styles.section}>
        <Heading2>Tabs</Heading2>
        
        <Tabs
          routes={[
            { key: 'tab1', title: 'First Tab' },
            { key: 'tab2', title: 'Second Tab' },
            { key: 'tab3', title: 'Third Tab' },
          ]}
          selectedIndex={tabIndex}
          onIndexChange={setTabIndex}
          renderScene={(route) => (
            <View style={styles.tabContent}>
              <BodyText>Content for {route.title}</BodyText>
            </View>
          )}
          style={{ height: 200, borderWidth: 1, borderColor: theme.colors.border }}
        />
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  exampleRow: {
    marginTop: 16,
    gap: 16,
  },
  buttonSpacing: {
    marginBottom: 8,
  },
  badgeExamples: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 16,
  },
  cardExample: {
    marginBottom: 16,
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tabContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
}); 