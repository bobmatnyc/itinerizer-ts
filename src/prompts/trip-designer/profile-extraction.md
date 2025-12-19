Analyze this trip planning conversation and extract the user's trip profile.

Extract:
1. **Demographics**: Traveler count, ages, relationships
2. **Budget**: Total, currency, flexibility
3. **Preferences**: Travel style, accommodation, pace
4. **Restrictions**: Dietary, mobility, allergies
5. **Interests**: Activities they mentioned or showed interest in
6. **Must-See**: Specific attractions or experiences
7. **Avoidances**: Things they want to avoid

Return confidence score (0-1) for each extracted field based on how explicitly stated it was.

Output as JSON matching the TripProfile type.
