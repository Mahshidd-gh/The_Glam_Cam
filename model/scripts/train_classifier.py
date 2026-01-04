# import numpy as np
# import joblib
# from sklearn.ensemble import GradientBoostingClassifier
# from sklearn.metrics import classification_report

# X_train = np.load("../features/X_train.npy")
# y_train = np.load("../features/y_train.npy")
# X_val = np.load("../features/X_val.npy")
# y_val = np.load("../features/y_val.npy")

# clf = GradientBoostingClassifier(
#     n_estimators=200,
#     learning_rate=0.05,
#     max_depth=3
# )

# clf.fit(X_train, y_train)

# preds = clf.predict(X_val)
# print(classification_report(y_val, preds))

# joblib.dump(clf, "../models/face_shape_clf.pkl")
# print("Model saved")
