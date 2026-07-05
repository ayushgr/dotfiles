// Flash a white border 3 times when the window gains focus.
// Driven purely by iFocus + iTimeFocus — no config swapping needed.
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    fragColor = texture(iChannel0, fragCoord / iResolution.xy);

    float t = iTime - iTimeFocus;

    // Only animate on focus gain, for 0.6 s
    if (iFocus == 1 || t > 0.6) return;

    // 5 Hz square wave → 3 ON pulses in 0.6 s (each 0.1 s on, 0.1 s off)
    float blink = step(fract(t * 5.0), 0.5);
    if (blink < 0.5) return;

    // Smooth gradient border, 4 px wide
    float edgeDist = min(
        min(fragCoord.x, iResolution.x - fragCoord.x),
        min(fragCoord.y, iResolution.y - fragCoord.y)
    );
    float alpha = (1.0 - smoothstep(0.0, 4.0, edgeDist)) * 0.9;
    if (alpha < 0.001) return;

    fragColor.rgb = mix(fragColor.rgb, vec3(1.0), alpha);
}
