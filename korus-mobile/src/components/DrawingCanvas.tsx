import { useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme, type Theme } from '../theme';

/**
 * Drawing surface for the composer, matching korus-web's DrawingCanvasInline:
 * same palette, same 1–30 brush range, same undo/redo/clear, and the same
 * output — a base64 PNG data URL that POST /api/posts uploads to Cloudinary.
 *
 * React Native has no <canvas>, so instead of painting pixels we accumulate
 * strokes as SVG paths and let react-native-svg rasterize the finished drawing
 * via its toDataURL(). That also makes undo trivial: drop the last stroke and
 * re-render, rather than replaying a bitmap history like the web version does.
 */

export interface Stroke {
  d: string;
  color: string;
  width: number;
}

/** Matches the web palette exactly, so a drawing looks the same on both. */
const COLORS = [
  '#00F0FF',
  '#9D4EDD',
  '#000000',
  '#FFFFFF',
  '#FF0000',
  '#00FF00',
  '#0000FF',
  '#FFFF00',
];

const BRUSH_SIZES = [2, 4, 8, 16, 30];

/** Fixed 550x300 on web; here it fills the width and keeps that aspect. */
const ASPECT = 550 / 300;

interface Props {
  onCancel: () => void;
  /** Receives a `data:image/png;base64,…` URL ready to send as imageUrl. */
  onSave: (dataUrl: string) => void;
}

export function DrawingCanvas({ onCancel, onSave }: Props) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [current, setCurrent] = useState<string>('');
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(4);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [saving, setSaving] = useState(false);

  const svgRef = useRef<Svg>(null);

  // Read through refs inside the responder: PanResponder is created once, so
  // capturing these as values would freeze them at their initial state and
  // every stroke would be the first colour and width.
  const colorRef = useRef(color);
  colorRef.current = color;
  const widthRef = useRef(width);
  widthRef.current = width;
  const pathRef = useRef('');

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // Keep the gesture even if a parent ScrollView wants it, otherwise a
        // vertical stroke scrolls the composer instead of drawing.
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,

        onPanResponderGrant: (e) => {
          const { locationX, locationY } = e.nativeEvent;
          pathRef.current = `M${round(locationX)},${round(locationY)}`;
          setCurrent(pathRef.current);
        },

        onPanResponderMove: (e) => {
          const { locationX, locationY } = e.nativeEvent;
          pathRef.current += ` L${round(locationX)},${round(locationY)}`;
          setCurrent(pathRef.current);
        },

        onPanResponderRelease: () => {
          const d = pathRef.current;
          pathRef.current = '';
          setCurrent('');
          if (!d) return;
          setStrokes((prev) => [
            ...prev,
            { d, color: colorRef.current, width: widthRef.current },
          ]);
          // A new stroke invalidates the redo branch, as on the web.
          setRedoStack([]);
        },
      }),
    []
  );

  function onLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    setSize({ w, h: Math.round(w / ASPECT) });
  }

  function undo() {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, last]);
      return prev.slice(0, -1);
    });
  }

  function redo() {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setStrokes((s) => [...s, last]);
      return prev.slice(0, -1);
    });
  }

  function clear() {
    setStrokes([]);
    setRedoStack([]);
  }

  function save() {
    if (!svgRef.current || strokes.length === 0) return;
    setSaving(true);
    // Rasterize at 2x for a crisper image once Cloudinary scales it down.
    svgRef.current.toDataURL(
      (base64) => {
        setSaving(false);
        onSave(`data:image/png;base64,${base64}`);
      },
      { width: size.w * 2, height: size.h * 2 }
    );
  }

  const isEmpty = strokes.length === 0 && !current;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Draw something</Text>
        <Pressable onPress={onCancel} hitSlop={10}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.swatches}>
        {COLORS.map((c) => (
          <Pressable
            key={c}
            onPress={() => setColor(c)}
            style={[
              styles.swatch,
              { backgroundColor: c },
              color === c && styles.swatchActive,
            ]}
          />
        ))}
      </View>

      <View style={styles.sizes}>
        {BRUSH_SIZES.map((s) => (
          <Pressable
            key={s}
            onPress={() => setWidth(s)}
            style={[styles.sizeButton, width === s && styles.sizeButtonActive]}
          >
            {/* The dot previews the actual brush width. */}
            <View
              style={{
                width: Math.min(s, 18),
                height: Math.min(s, 18),
                borderRadius: 9,
                backgroundColor: width === s ? t.mint : t.textTertiary,
              }}
            />
          </Pressable>
        ))}
      </View>

      <View style={styles.canvasWrap} onLayout={onLayout}>
        {size.w > 0 ? (
          <View
            style={[styles.canvas, { height: size.h }]}
            {...pan.panHandlers}
          >
            {/* The viewBox is what makes the 2x export work. toDataURL's
                width/height set the output bitmap size but do not scale the
                coordinate space, so without it the strokes render at their
                original 1:1 coordinates into a canvas twice the size — the
                drawing lands in the top-left quadrant and is cropped on the
                right and bottom. */}
            <Svg
              ref={svgRef}
              width={size.w}
              height={size.h}
              viewBox={`0 0 ${size.w} ${size.h}`}
            >
              {/* Explicit white ground: without it the exported PNG is
                  transparent, which reads as black in the feed's dark theme. */}
              <Rect x={0} y={0} width={size.w} height={size.h} fill="#FFFFFF" />
              {strokes.map((s, i) => (
                <Path
                  key={i}
                  d={s.d}
                  stroke={s.color}
                  strokeWidth={s.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ))}
              {current ? (
                <Path
                  d={current}
                  stroke={color}
                  strokeWidth={width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ) : null}
            </Svg>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={undo}
          disabled={strokes.length === 0}
          style={[styles.action, strokes.length === 0 && styles.actionDisabled]}
        >
          <Text style={styles.actionText}>↶ Undo</Text>
        </Pressable>
        <Pressable
          onPress={redo}
          disabled={redoStack.length === 0}
          style={[styles.action, redoStack.length === 0 && styles.actionDisabled]}
        >
          <Text style={styles.actionText}>↷ Redo</Text>
        </Pressable>
        <Pressable
          onPress={clear}
          disabled={isEmpty}
          style={[styles.action, isEmpty && styles.actionDisabled]}
        >
          <Text style={styles.actionText}>Clear</Text>
        </Pressable>

        <View style={styles.spacer} />

        <Pressable
          onPress={save}
          disabled={isEmpty || saving}
          style={[styles.save, (isEmpty || saving) && styles.actionDisabled]}
        >
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Add drawing'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Halves the path string length; sub-pixel precision is invisible here. */
function round(n: number): number {
  return Math.round(n * 10) / 10;
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    title: { color: theme.text, fontSize: 14, fontWeight: '700' },
    close: { color: theme.textTertiary, fontSize: 16 },
    swatches: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    swatch: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      borderColor: 'rgba(128,128,128,0.35)',
    },
    swatchActive: { borderColor: theme.mint, transform: [{ scale: 1.15 }] },
    sizes: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    sizeButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sizeButtonActive: { borderColor: theme.mint },
    canvasWrap: { width: '100%' },
    canvas: {
      width: '100%',
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: '#FFFFFF',
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
    },
    action: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    actionDisabled: { opacity: 0.35 },
    actionText: { color: theme.text, fontSize: 12, fontWeight: '600' },
    spacer: { flex: 1 },
    save: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: theme.mint,
    },
    saveText: { color: '#0a0a0a', fontSize: 13, fontWeight: '800' },
  });
