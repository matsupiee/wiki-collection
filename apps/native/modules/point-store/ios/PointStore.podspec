Pod::Spec.new do |s|
  s.name = 'PointStore'
  s.version = '1.0.0'
  s.summary = 'StoreKit purchases for Wiki Collection'
  s.homepage = 'https://github.com/matsupiee/wiki-collection'
  s.license = 'Private'
  s.author = 'Wiki Collection'
  s.source = { :git => 'https://github.com/matsupiee/wiki-collection.git' }
  s.platform = :ios, '16.4'
  s.static_framework = true
  s.source_files = '*.swift'
  s.dependency 'ExpoModulesCore'
end
