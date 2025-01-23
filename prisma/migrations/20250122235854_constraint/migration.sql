ALTER TABLE "SavedLocation"
ADD CONSTRAINT unique_saved_location_constraint UNIQUE NULLS NOT DISTINCT ("userId", type, "locationId", latitude, longitude, radius, "radiusUnit", "geomType",deleted);