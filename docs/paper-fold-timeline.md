# Paper Fold Timeline

This note documents the temporary paper-fold animation timing system.

## Current Goal

The fold animation has multiple related moving parts:

- main paper triangles
- duplicate/shadow triangles
- duplicate offset settling
- closed hold
- opening movement

The important rule is that duplicate/shadow offset timing should follow the main triangle movement timing. It should not be a separate hardcoded percentage that has to be manually fixed every time the fold movement changes.

## Timeline Source

The timing source lives in `scripts/views/app-view.js`:

```js
const PAPER_FOLD_TIMELINE = {
    totalDurationMs: 11300,
    closeEnd: 0.42,
    openStart: 0.58,
    offsetHoldWithinClose: 0.24,
    offsetSettleWithinClose: 0.55,
    offsetReturn: 0.70
};
```

## Meaning

`totalDurationMs`

Total fold animation length.

`closeEnd`

The point in the total animation where the main paper triangles finish closing into the center.

Example:

```text
0.42 = 42%
```

`openStart`

The point in the total animation where the closed hold ends and the triangles begin opening back out.

Example:

```text
0.58 = 58%
```

`offsetHoldWithinClose`

How long the duplicate/shadow offset should stay at its full offset, expressed as a ratio of the closing phase.

Example:

```text
closeEnd 0.42 * offsetHoldWithinClose 0.24 = 0.1008
```

So the duplicate stays fully offset until about `10%` of the total timeline.

`offsetSettleWithinClose`

When the duplicate/shadow offset should reach perfect alignment, expressed as a ratio of the closing phase.

Example:

```text
closeEnd 0.42 * offsetSettleWithinClose 0.55 = 0.231
```

So the duplicate reaches `translate(0, 0)` at about `23.1%` of the total timeline.

`offsetReturn`

The point in the total animation where the duplicate/shadow offset returns to its full offset during opening.

Example:

```text
0.70 = 70%
```

So the duplicate returns to `translate(3px, 3px)` at `70%` of the total timeline.

## Why This Exists

If the main close movement is changed from:

```text
closeEnd = 0.42
```

to:

```text
closeEnd = 0.34
```

the duplicate offset timing automatically follows:

```text
0.34 * 0.55 = 0.187
```

So the offset reaches alignment at `18.7%` instead of staying stuck at the old `23%`.

This keeps the visual relationship intact.

## Runtime Keyframes

CSS cannot use variables as keyframe selectors, so the runtime keyframes are generated in JavaScript by `syncPaperFoldTimeline()`.

The CSS keyframes in `styles/landing.css` are fallback definitions only. They should not be treated as the main timing source.

## Tuning Rules

To make the close movement faster:

```js
closeEnd: 0.36
```

To make the closed hold longer:

```js
openStart: 0.64
```

To make the duplicate/shadow offset settle earlier during closing:

```js
offsetSettleWithinClose: 0.45
```

To make it settle later:

```js
offsetSettleWithinClose: 0.65
```

To make the duplicate/shadow offset return earlier during opening:

```js
offsetReturn: 0.66
```

To make it return later:

```js
offsetReturn: 0.78
```

## Current Debug State

The current PWA fold is in a debug state:

- only the left/pink triangle is visible
- the left duplicate/blue triangle sits behind it
- the duplicate offset is currently `translate(3px, 3px)`
- the duplicate offset settles to `translate(0, 0)` based on `offsetSettleWithinClose`
- result page debug color is enabled
- camera background debug color is enabled

This should be cleaned up before production styling.
