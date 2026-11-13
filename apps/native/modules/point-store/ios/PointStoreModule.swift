import ExpoModulesCore
import StoreKit

public final class PointStoreModule: Module {
  private var listener: Task<Void, Never>?

  public func definition() -> ModuleDefinition {
    Name("PointStore")
    Events("updated")

    OnStartObserving {
      self.listener = Task {
        for await _ in Transaction.updates {
          self.sendEvent("updated")
        }
      }
    }
    OnStopObserving { self.listener?.cancel() }

    AsyncFunction("prices") { (ids: [String]) async throws -> [String: String] in
      let products = try await Product.products(for: ids)
      return Dictionary(uniqueKeysWithValues: products.map { ($0.id, $0.displayPrice) })
    }

    AsyncFunction("buy") { (id: String, token: String) async throws -> String in
      guard let account = UUID(uuidString: token),
            let product = try await Product.products(for: [id]).first,
            product.type == .consumable else { throw StoreError.unavailable }
      switch try await product.purchase(options: [.appAccountToken(account)]) {
      case .success(let result):
        _ = try result.payloadValue
        return result.jwsRepresentation
      case .userCancelled: return "cancelled"
      case .pending: return "pending"
      @unknown default: throw StoreError.unavailable
      }
    }

    AsyncFunction("unfinished") { (token: String) async -> [String] in
      var receipts: [String] = []
      for await result in Transaction.unfinished {
        if case .verified(let tx) = result, tx.appAccountToken == UUID(uuidString: token) {
          receipts.append(result.jwsRepresentation)
        }
      }
      return receipts
    }

    AsyncFunction("finish") { (receipt: String) async in
      for await result in Transaction.unfinished {
        if case .verified(let tx) = result, result.jwsRepresentation == receipt {
          await tx.finish()
        }
      }
    }
  }
}

private enum StoreError: Error { case unavailable }
