-- Deactivate 4 duplicate pending celebrity records that have approved counterparts
UPDATE celebrities SET is_active = false 
WHERE id IN (
  'a3c362e8-ce23-438a-8bff-b4dbf6d2b996',
  '8e14109d-d3cc-4e59-9314-e656a907c96a',
  '371db0c0-16d2-4124-af13-6231886f0e47',
  'f49718fd-00af-49d9-a7fd-203a0b0eb5fd'
);