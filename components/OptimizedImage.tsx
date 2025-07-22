import React from 'react';
import { Image, ImageProps } from 'expo-image';
import { StyleSheet } from 'react-native';

const blurhash = 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH';

interface OptimizedImageProps extends Omit<ImageProps, 'placeholder'> {
  blurhash?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  style,
  blurhash: customBlurhash,
  ...props
}) => {
  return (
    <Image
      {...props}
      style={style}
      placeholder={customBlurhash || blurhash}
      contentFit="cover"
      transition={200}
      cachePolicy="memory-disk"
      recyclingKey={props.source?.toString()}
    />
  );
};

export default React.memo(OptimizedImage, (prevProps, nextProps) => {
  // Only re-render if source changes
  return JSON.stringify(prevProps.source) === JSON.stringify(nextProps.source);
});